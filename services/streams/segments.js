const { Stream, StreamSegment, StreamSourceFile, FileExtension, Sequelize } = require('../../modelsTimescale')
const { hasPermission, READ, STREAM } = require('../../services/roles')
const messageQueue = require('../../utils/message-queue/default')
const { SEGMENT_CREATED } = require('../../tasks/event-names')
const { ValidationError, EmptyResultError, ForbiddenError } = require('../../utils/errors')
const pagedQuery = require('../../utils/db/paged-query')

const availableIncludes = [
  StreamSourceFile.include(),
  FileExtension.include()
]

/**
 * Get a list of stream segments matching the filters
 * @param {*} filters
 * @param {string} filters.streamId Segments by stream (required)
 * @param {string|number} filters.start Segments starting on or after (moment) (required)
 * @param {string|number} filters.end Segments start before (moment) (required)
 * @param {*} options Query options
 * @param {boolean} options.cover Modify start/end filters to return all segments that cover or overlap start/end
 * @param {string[]} options.fields Attributes and relations to include in results
 * @param {number} options.limit Maximum results to include
 * @param {number} options.offset Number of results to skip
 * @param {number} options.readableBy Include only segments readable by the given user id
 */
async function query (filters, options = {}) {
  if (filters.end < filters.start) {
    throw new ValidationError('"end" attribute cannot be less than "start" attribute')
  }
  if (!(await Stream.findByPk(filters.streamId))) {
    throw new EmptyResultError('Stream not found')
  }
  if (options.readableBy && !(await hasPermission(READ, options.readableBy, filters.streamId, STREAM))) {
    throw new ForbiddenError()
  }

  const where = {
    stream_id: filters.streamId
  }
  if (options.cover) {
    where[Sequelize.Op.or] = {
      start: {
        [Sequelize.Op.between]: [filters.start.valueOf(), filters.end.valueOf()]
      },
      end: {
        [Sequelize.Op.between]: [filters.start.valueOf(), filters.end.valueOf()]
      },
      [Sequelize.Op.and]: {
        start: { [Sequelize.Op.lt]: filters.start.valueOf() },
        end: { [Sequelize.Op.gt]: filters.end.valueOf() }
      }
    }
  } else {
    where.start = {
      [Sequelize.Op.between]: [filters.start.valueOf(), filters.end.valueOf()]
    }
  }

  const attributes = options.fields && options.fields.length > 0 ? StreamSegment.attributes.full.filter(a => options.fields.includes(a)) : StreamSegment.attributes.full
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : [FileExtension.include()]

  return pagedQuery(StreamSegment, {
    where,
    limit: options.limit,
    offset: options.offset,
    attributes,
    include,
    order: [['start', 'ASC']]
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
    .then(() => {
      if (messageQueue.isEnabled()) {
        const message = { id: segment.id, start: segment.start, stream_id: segment.stream_id }
        return messageQueue.publish(SEGMENT_CREATED, message).catch((e) => {
          console.error('Stream segment service -> create -> publish failed', e.message || e)
        })
      }
    })
    .catch((e) => {
      console.error('Stream segment service -> create -> error', e)
      throw new ValidationError('Cannot create stream segment with provided data')
    })
}

/**
 * Collects gaps for selected time range and calculates coverage
 * @param {*} attrs segment attributes
 */
async function getStreamCoverage (attrs) {
  const queryData = await query(attrs)
  const segments = queryData.streamSegments
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
          start: { [Sequelize.Op.gte]: time }
        },
        order: [['start', 'ASC']]
      })
      .then((dbSegment) => {
        return dbSegment ? dbSegment.start : null
      })
  }
}

function format (item) {
  return {
    ...item,
    file_extension: item.file_extension ? item.file_extension.value : null // eslint-disable-line camelcase
  }
}

module.exports = {
  query,
  create,
  getStreamCoverage,
  getNextSegmentTimeAfterSegment
}
