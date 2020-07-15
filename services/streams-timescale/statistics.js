const models = require('../../modelsTimescale')
const EmptyResultError = require('../../utils/converter/empty-result-error')
const ValidationError = require('../../utils/converter/validation-error')
const ForbiddenError = require('../../utils/converter/forbidden-error')
const streamsService = require('./index')
const moment = require('moment')

const MS_IN_HR = 10800000;

async function getStreams(attrs) {
  attrs.created_by = 'me'
  if (attrs.stream_id) { // if client requested single id, request only it
    const stream = await streamsService.getById(attrs.stream_id)
    var streams = [stream]
  }
  else {
    const streamsData = await streamsService.query(attrs)
    var streams = streamsData.streams
  }
  return streams
}

async function getUploads(attrs) {
  // TODO: we may want to think of caching these calculations in REDIS
  // cache will be cleared on each stream-segment creation request
  let statistics = { // create empty final object
    uploads: []
  }
  const streams = await getStreams(attrs)
  let totalUploads = 0
  let totalMilliseconds = 0

  const now = moment.utc()
  // get start/end datas of each month
  const last3Mo = [
    [now.clone().subtract(2, 'months').startOf('month'), now.clone().subtract(2, 'months').endOf('month')],
    [now.clone().subtract(1, 'months').startOf('month'), now.clone().subtract(1, 'months').endOf('month')],
    [now.clone().startOf('month'), now.clone().endOf('month')],
  ]
  for (let stream of streams) {
    // get all stream segment files for stream
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id }})
    // calculate duration for stream
    const streamTotalMilliseconds = (stream.start && stream.end) ? (stream.end - stream.start) : 0
    // calculate total uploads number based on distinct source files number
    totalUploads += [...new Set(streamSegments.map(d => d.source_file_id))].length
    totalMilliseconds += streamTotalMilliseconds

    let recentUploads = []
    // calculate uploads for last 3 months
    for (let month of last3Mo) {
      let filteredSegments = streamSegments.filter((segment) => {
        return segment.start >= month[0] && segment.end <= month[1]
      })
      recentUploads.push({
        month: month[0].format('MMM'),
        value: [...new Set(filteredSegments.map(d => d.source_file_id))].length
      })
    }

    statistics.uploads.push({
      streamName: stream.name,
      recentUploads
    })
  }
  statistics.totalUploads = totalUploads;
  statistics.totalHours = totalMilliseconds > MS_IN_HR ? Math.floor(totalMilliseconds/MS_IN_HR) : totalMilliseconds/MS_IN_HR
  return statistics
}

async function getAnnotations(attrs) {
  // TODO: we may want to think of caching these calculations in REDIS
  // cache will be cleared on each annotation creation request
  let statistics = {
    frequentClassifications: []
  }
  const streams = await getStreams(attrs)
  const streamsIDs = (streams || []).map(x => x.id)

  const where = {
    start: {
      [models.Sequelize.Op.gte]: 0,
      [models.Sequelize.Op.lt]: moment.utc().valueOf()
    },
    stream_id: {
      [models.Sequelize.Op.in]: streamsIDs,
    }
  }

  // get all distinct annotations with their count
  const frequencyData = await models.Annotation.findAll({
    where,
    include: [
      {
        as: 'classification',
        model: models.Classification,
        attributes: ['value', 'title'],
      }
    ],
    group: ['classification.id'],
    attributes: ['classification.id', [models.Sequelize.fn('COUNT', 'classification.id'), 'total']],
    order: [['count', 'DESC']],
    limit: attrs.limit || 4,
    raw: true
  })
  // push data into resulting object
  frequencyData.forEach((item) => {
    statistics.frequentClassifications.push({
      name: item['classification.title'],
      value: parseInt(item.total)
    })
  })

  // get total count of annotations for selected streams
  const totalAnnotations = await models.Annotation.count({ where })
  statistics.totalAnnotations = totalAnnotations

  // get total count of distinct classifications for selected streams
  const totalClassifications = await models.Annotation.count({
    where,
    col: ['classification_id'],
    distinct: true
  })
  statistics.totalClassifications = totalClassifications

  // get total count of annotations in previous 7 days
  const totalAnnPrev7Days = await models.Annotation.count({
    where: {
      start: {
        [models.Sequelize.Op.gte]: moment.utc().subtract(14, 'days').valueOf(),
        [models.Sequelize.Op.lt]: moment.utc().subtract(7, 'days').valueOf()
      },
      stream_id: {
        [models.Sequelize.Op.in]: streamsIDs,
      }
    }
  })

  // get total count of annotations in last 7 days
  const totalAnnLast7Days = await models.Annotation.count({
    where: {
      start: {
        [models.Sequelize.Op.gte]: moment.utc().subtract(7, 'days').valueOf(),
        [models.Sequelize.Op.lt]: moment.utc().valueOf()
      },
      stream_id: {
        [models.Sequelize.Op.in]: streamsIDs,
      }
    }
  })

  // calculate weekly increase percentage
  statistics.weeklyIncreasedPercentage = (totalAnnLast7Days - totalAnnPrev7Days) / (totalAnnPrev7Days || 1) * 100 // when "past" value is 0, we cannot divide by it, we will use 1 instead

  return statistics
}

module.exports = {
  getUploads,
  getAnnotations
}
