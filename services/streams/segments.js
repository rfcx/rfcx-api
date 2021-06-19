const { Stream, StreamSegment, StreamSourceFile, FileExtension, Sequelize } = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const messageQueue = require('../../utils/message-queue/default')
const { SEGMENT_CREATED } = require('../../tasks/event-names')

const availableIncludes = [
  Stream.include(),
  StreamSourceFile.include(),
  FileExtension.include()
]

/**
 * Returns list of stream segments with total number filtered by specified attributes
 * @param {*} attrs stream segment attributes
 * @param {*} opts additional function params
 */
function query (attrs, opts = {}) {
  if (attrs.end < attrs.start) {
    throw new ValidationError('"end" attribute can not be less than "start" attribute')
  }
  const where = {
    stream_id: attrs.stream_id
  }
  if (attrs.start.valueOf() === attrs.end.valueOf()) {
    where[Sequelize.Op.or] = {
      start: attrs.start.valueOf(),
      end: attrs.start.valueOf(),
      [Sequelize.Op.and]: {
        start: { [Sequelize.Op.lt]: attrs.start.valueOf() },
        end: { [Sequelize.Op.gt]: attrs.end.valueOf() }
      }
    }
  } else {
    where[Sequelize.Op.not] = {
      [Sequelize.Op.or]: [
        { start: { [Sequelize.Op.gte]: attrs.end.valueOf() } },
        { end: { [Sequelize.Op.lte]: attrs.start.valueOf() } }
      ]
    }
  }

  const method = (!!attrs.limit || !!attrs.offset) ? 'findAndCountAll' : 'findAll' // don't use findAndCountAll if we don't need to limit and offset
  return StreamSegment[method]({
    where,
    limit: attrs.limit,
    offset: attrs.offset,
    attributes: StreamSegment.attributes.full,
    include: opts.joinRelations ? availableIncludes : [],
    order: [['start', 'ASC']]
  })
    .then((data) => {
      return {
        count: method === 'findAndCountAll' ? data.count : data.length,
        streamSegments: method === 'findAndCountAll' ? data.rows : data
      }
    })
}

/**
 * Searches for segment model with given id
 * @param {string} id
 * @param {*} opts additional function params
 * @returns {*} segment model item
 */
function get (id, opts = {}) {
  return StreamSegment
    .findOne({
      where: { id },
      attributes: StreamSegment.attributes.full,
      include: opts && opts.joinRelations ? availableIncludes : []
    })
    .then(item => {
      if (!item) {
        throw new EmptyResultError('Stream segment with given id not found.')
      }
      return item
    })
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
 * Destroys segment item
 * @param {*} segment segment modei item
 */
function remove (segment) {
  return segment.destroy()
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

/**
 * Formats single item or array with multiple items
 * @param {*} items single item or array with multiple items
 */
function format (data) {
  const isArray = Array.isArray(data)
  data = isArray ? data : [data]
  data = data.map((item) => {
    const { id, stream, start, end, sample_count, source_file, file_extension } = item // eslint-disable-line camelcase
    return {
      id,
      stream,
      start,
      end,
      sample_count,
      source_file,
      file_extension: file_extension && file_extension.value ? file_extension.value : null // eslint-disable-line camelcase
    }
  })
  return isArray ? data : data[0]
}

module.exports = {
  query,
  get,
  create,
  remove,
  getStreamCoverage,
  format,
  getNextSegmentTimeAfterSegment
}
