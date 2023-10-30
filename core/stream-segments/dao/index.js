const { Stream, StreamSegment, StreamSourceFile, FileExtension, ClassifierProcessedSegment, Sequelize } = require('../../_models')
const { hasPermission, READ, STREAM } = require('../../roles/dao')
const messageQueue = require('../../../common/message-queue/sqs')
const { SEGMENT_CREATED } = require('../../../common/message-queue/event-names')
const { ValidationError, EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')
const pagedQuery = require('../../_utils/db/paged-query')
const moment = require('moment-timezone')
const Op = Sequelize.Op

const availableIncludes = [
  StreamSourceFile.include(),
  FileExtension.include()
]

/**
 * Get a stream segment
 *
 * For best performance, use strict = true (default)
 * @param {string} streamId
 * @param {string|number} start
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if stream is accessible to the given user id
 * @param {boolean} options.strict When false, modify start/end filters to return all segments that cover or overlap start/end
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to all)
 * @param {Transaction} options.transaction Perform in the given Sequelize transaction
 * @returns {StreamSegment}
 * @throws EmptyResultError when segment not found
 * @throws ForbiddenError when `readableBy` user does not have read permission on the organization
 */
async function get (streamId, start, options = {}) {
  const where = options.strict === false
    ? {
        stream_id: streamId,
        start: { [Op.lte]: start.valueOf() },
        end: { [Op.gt]: start.valueOf() }
      }
    : {
        stream_id: streamId,
        start: start.valueOf()
      }
  const requiredAttributes = ['stream_id']
  const attributes = options.fields && options.fields.length > 0 ? StreamSegment.attributes.full.filter(a => options.fields.includes(a) || requiredAttributes.includes(a)) : StreamSegment.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : availableIncludes
  const transaction = options.transaction || null
  const order = [['start', 'ASC']]

  const segment = await StreamSegment.findOne({ where, attributes, include, order, transaction })

  if (!segment) {
    throw new EmptyResultError('Segment not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, segment.stream_id, STREAM))) {
    throw new ForbiddenError()
  }

  return format(segment.toJSON(), options.fields || (StreamSegment.attributes.lite.concat(availableIncludes.map(i => i.as))))
}

/**
 * Get a list of stream segments matching the filters
 * @param {*} filters
 * @param {string} filters.streamId Segments by stream (required)
 * @param {string|number} filters.start Segments starting on or after (moment) (required)
 * @param {string|number} filters.end Segments start before (moment) (required)
 * @param {*} options Query options
 * @param {boolean} options.strict When false, modify start/end filters to return all segments that cover or overlap start/end
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 * @param {number} options.readableBy Include only segments readable by the given user id
 */
async function query (filters, options = {}) {
  const transaction = options.transaction
  if (filters.start && filters.end && filters.end < filters.start) {
    throw new ValidationError('"end" attribute cannot be less than "start" attribute')
  }
  // TODO: move this out as it's not related to segments querying and should be done beforehand
  if (!(await Stream.findByPk(filters.streamId, { transaction }))) {
    throw new EmptyResultError('Stream not found')
  }
  // TODO: move this out as it's not related to segments querying and should be done beforehand
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, filters.streamId, STREAM))) {
    throw new ForbiddenError()
  }
  const where = {
    [Op.and]: {
      stream_id: filters.streamId
    }
  }
  if (filters.start && filters.end) {
    if (options.strict === false) {
      where[Op.and].start = {
        // When we use both `start` and `end` attributes in query, TImescaleDB can't use hypertable indexes in a full way,
        // because hypertables are spitted by `stream_id` + `start` only. So database has to check all chunks.
        // A solution to this is to limit search to exact one-two chunks first and then search by `start` + `end` only inside these chunks.
        // We have to find a timeframe where segment with its own full duration will be places. We don't know duration of each segment, so we
        // will add some time to beginning and some time to the end (10 minutes to be safe).
        [Op.between]: [filters.start.clone().subtract(10, 'minutes').valueOf(), filters.end.clone().add(10, 'minutes').valueOf()]
      }
      where[Op.and][Op.or] = {
        start: {
          [Op.gte]: filters.start.valueOf(),
          [Op.lt]: filters.end.valueOf()
        },
        end: {
          [Op.gt]: filters.start.valueOf(),
          [Op.lte]: filters.end.valueOf()
        },
        [Op.and]: {
          start: { [Op.lt]: filters.start.valueOf() },
          end: { [Op.gt]: filters.end.valueOf() }
        }
      }
    } else {
      where[Op.and].start = {
        [Op.between]: [filters.start.valueOf(), filters.end.valueOf()]
      }
    }
  }
  if (filters.streamSourceFileId !== undefined) {
    where[Op.and].stream_source_file_id = {
      [Op.eq]: filters.streamSourceFileId
    }
  }
  if (filters.unprocessedByClassifier !== undefined) {
    const processedSegments = await ClassifierProcessedSegment.findAll({
      where: {
        ...where,
        classifierId: filters.unprocessedByClassifier
      },
      attributes: ['start']
    })
    if (processedSegments.length) {
      if (!where[Op.and].start) {
        where[Op.and].start = {}
      }
      where[Op.and].start[Op.notIn] = processedSegments.map(s => s.start)
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? StreamSegment.attributes.full.filter(a => options.fields.includes(a)) : StreamSegment.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : [FileExtension.include()]

  return pagedQuery(StreamSegment, {
    where,
    limit: options.limit,
    offset: options.offset,
    attributes,
    include,
    order: [['start', 'ASC']],
    transaction
  }).then(({ results, count }) => ({ results: results.map(segment => format(segment)), count }))
}

/**
 * Create stream segment
 * @param {*} segment Stream segment attributes
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
function create (segment, options = {}) {
  const transaction = options.transaction
  return StreamSegment.create(segment, { transaction })
    .catch((e) => {
      console.error('Stream segment service -> create -> error', e)
      throw new ValidationError('Cannot create stream segment with provided data')
    })
}

/**
 * Find or create stream segment
 * @param {*} where Stream segment attributes to use for search
 * @param {*} defaults Stream segment attributes to use for creation
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
function findOrCreate (where, defaults, options = {}) {
  const transaction = options.transaction
  return StreamSegment.findOrCreate({ where, defaults, transaction })
    .spread((segment, created) => {
      return { segment, created }
    })
    .catch((e) => {
      console.error('Stream segment service -> findOrCreate -> error', e)
      throw new ValidationError('Cannot create stream segment with provided data')
    })
}

/**
 * Find all segments belonging to a stream within specified start array
 * @param {string} streamId Stream id
 * @param {string[]} starts Stream segment attributes to use for creation
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
function findByStreamAndStarts (streamId, starts, options = {}) {
  const transaction = options.transaction
  const where = getWhereForStreamAndStarts(streamId, starts)
  const attributes = options.fields && options.fields.length > 0 ? StreamSegment.attributes.full.filter(a => options.fields.includes(a)) : StreamSegment.attributes.lite
  return StreamSegment.findAll({ where, attributes, transaction })
    .catch((e) => {
      console.error('Stream segment service -> findByStreamAndStarts -> error', e)
      throw e
    })
}

function getISOString (date) {
  return moment.utc(date).toISOString()
}

function getWhereForStreamAndStarts (streamId, starts) {
  const dates = starts.map(s => moment.utc(s).valueOf()).sort((a, b) => {
    return a - b
  })
  const where = {
    stream_id: streamId,
    start: {
      [Sequelize.Op.gte]: getISOString(dates[0]),
      [Sequelize.Op.lte]: getISOString(dates[dates.length - 1]),
      [Sequelize.Op.in]: starts
    }
  }
  return where
}

/**
 * Update all segments belonging to a stream within specified start array
 * @param {string} streamId Stream id
 * @param {string[]} starts Stream segment attributes to use for creation
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
function updateByStreamAndStarts (streamId, starts, data, options = {}) {
  const { transaction } = options.transaction
  const where = getWhereForStreamAndStarts(streamId, starts)
  return StreamSegment.update(data, { where, transaction })
}

/**
 * Bulk create stream segment
 * @param {*} segments Array of stream segment attributes
 * @param {*} options
 * @param {Transaction} options.transaction Perform within given transaction
 */
function bulkCreate (segments, options = {}) {
  const transaction = options.transaction
  const returning = options.returning
  return StreamSegment.bulkCreate(segments, { transaction, returning })
    .catch((e) => {
      console.error('Stream segment service -> bulkCreate -> error', e)
      throw new ValidationError('Cannot bulkCreate stream segment with provided data')
    })
}

/**
 * Update a stream segment
 *
 * @param {string} streamId
 * @param {string|number} start
 * @param {*} options Additional get options
 * @param {Transaction} options.transaction Perform in the given Sequelize transaction
 * @returns {StreamSegment}
 * @throws EmptyResultError when segment not found
 */
async function update (streamId, start, data, options = {}) {
  const transaction = options.transaction
  return await StreamSegment.update(data, { where: { stream_id: streamId, start: start.valueOf() }, transaction })
}

/**
 * Notify about new segment
 * @param {*} segment Stream segment object
 */
function notify (segment) {
  if (!messageQueue.isEnabled()) {
    return
  }
  const message = { id: segment.id, start: segment.start, streamId: segment.stream_id }
  return messageQueue.publish(SEGMENT_CREATED, message).catch((e) => {
    console.error('Stream segment service -> publish failed', e.message || e)
  })
}

/**
 * Collects gaps for selected time range and calculates coverage
 * @param {*} attrs segment attributes
 */
async function getStreamCoverage (attrs) {
  const queryData = await query(attrs)
  const segments = queryData.results
  if (!segments.length) {
    return {
      coverage: 0,
      gaps: [{
        start: attrs.start,
        end: attrs.end
      }]
    }
  }
  const gaps = []
  let totalDuration = 0
  segments.forEach((current, index) => {
    const prev = index === 0 ? null : segments[index - 1]
    const prevEnds = prev ? prev.end : attrs.start
    totalDuration += (current.end - current.start)
    if (current.start > prevEnds) {
      gaps.push({
        start: prevEnds,
        end: current.start
      })
    }
  })
  const lastSegment = segments[segments.length - 1]
  if (lastSegment && (attrs.end > lastSegment.end)) {
    gaps.push({
      start: lastSegment.end,
      end: attrs.end
    })
  }
  const coverage = {
    coverage: totalDuration / (attrs.end - attrs.start),
    gaps
  }
  return coverage
}

function getNextSegmentTimeAfterSegment (segment, time) {
  if (segment.end > time) {
    return Promise.resolve(time)
  } else {
    return StreamSegment
      .findOne({
        where: {
          stream_id: segment.stream_id,
          start: { [Op.gte]: time }
        },
        order: [['start', 'ASC']]
      })
      .then((dbSegment) => {
        return dbSegment ? dbSegment.start : null
      })
  }
}

// TODO `format` could be generic, with a standard way to handle computed properties
function pick (o, props) {
  return Object.assign({}, ...props.map(prop => ({ [prop]: o[prop] })))
}
function format (item, keys = undefined) {
  const computedItem = {
    ...item,
    file_extension: item.file_extension ? item.file_extension.value : null // eslint-disable-line camelcase
  }
  return keys ? pick(computedItem, keys) : computedItem
}

function removeDuplicates (segments) {
  return segments.reduce((acc, cur) => {
    const existing = acc.find(i => i.start.valueOf() === cur.start.valueOf())
    if (!existing) {
      acc.push(cur)
    }
    return acc
  }, [])
}

module.exports = {
  get,
  query,
  bulkCreate,
  create,
  findOrCreate,
  findByStreamAndStarts,
  updateByStreamAndStarts,
  update,
  notify,
  getStreamCoverage,
  getNextSegmentTimeAfterSegment,
  removeDuplicates
}
