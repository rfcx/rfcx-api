const models = require('../../_models')
const dao = require('../dao')
const moment = require('moment')

const MS_IN_HR = 10800000

async function getStreams (attrs) {
  let streams
  if (attrs.stream_id) { // if client requested single id, request only it
    const stream = await dao.get(attrs.stream_id)
    streams = [stream]
  } else {
    const streamsData = await dao.query(attrs)
    streams = streamsData.streams
  }
  return streams
}

async function getUploads (attrs) {
  // cache will be cleared on each stream-segment creation request
  const statistics = { // create empty final object
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
    [now.clone().startOf('month'), now.clone().endOf('month')]
  ]
  for (const stream of streams) {
    // get all stream segment files for stream
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    // calculate duration for stream
    const streamTotalMilliseconds = streamSegments.reduce((acc, segment) => {
      return acc + (segment.end - segment.start)
    }, 0)
    // calculate total uploads number based on distinct source files number
    totalUploads += [...new Set(streamSegments.map(d => d.stream_source_file_id))].length
    totalMilliseconds += streamTotalMilliseconds

    const recentUploads = []
    // calculate uploads for last 3 months
    for (const month of last3Mo) {
      const filteredSegments = streamSegments.filter((segment) => {
        return segment.created_at >= month[0] && segment.created_at <= month[1]
      })
      recentUploads.push({
        month: month[0].format('MMM'),
        value: [...new Set(filteredSegments.map(d => d.stream_source_file_id))].length
      })
    }

    statistics.uploads.push({
      streamName: stream.name,
      recentUploads
    })
  }
  statistics.totalUploads = totalUploads
  statistics.totalHours = totalMilliseconds > MS_IN_HR ? Math.floor(totalMilliseconds / MS_IN_HR) : totalMilliseconds / MS_IN_HR
  return statistics
}

async function getAnnotations (attrs) {
  // cache will be cleared on each annotation creation request
  const statistics = {
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
      [models.Sequelize.Op.in]: streamsIDs
    }
  }

  // get all distinct annotations with their count
  const frequencyData = await models.Annotation.findAll({
    where,
    include: [
      {
        as: 'classification',
        model: models.Classification,
        attributes: ['value', 'title']
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
      created_at: {
        [models.Sequelize.Op.gte]: moment.utc().subtract(14, 'days').valueOf(),
        [models.Sequelize.Op.lt]: moment.utc().subtract(7, 'days').valueOf()
      },
      stream_id: {
        [models.Sequelize.Op.in]: streamsIDs
      }
    }
  })

  // get total count of annotations in last 7 days
  const totalAnnLast7Days = await models.Annotation.count({
    where: {
      created_at: {
        [models.Sequelize.Op.gte]: moment.utc().subtract(7, 'days').valueOf(),
        [models.Sequelize.Op.lt]: moment.utc().valueOf()
      },
      stream_id: {
        [models.Sequelize.Op.in]: streamsIDs
      }
    }
  })

  // calculate weekly increase percentage
  statistics.weeklyIncreasedPercentage = (totalAnnLast7Days - totalAnnPrev7Days) / (totalAnnPrev7Days || 1) * 100 // when "past" value is 0, we cannot divide by it, we will use 1 instead

  return statistics
}

async function getDetections (attrs) {
  // cache will be cleared on each annotation creation request
  const statistics = {}
  const streams = await getStreams(attrs)
  const streamsIDs = (streams || []).map(x => x.id)

  const where = {
    start: {
      [models.Sequelize.Op.gte]: 0,
      [models.Sequelize.Op.lt]: moment.utc().valueOf()
    },
    stream_id: {
      [models.Sequelize.Op.in]: streamsIDs
    }
  }

  const totalDetections = await models.Detection.count({ where })
  statistics.totalDetections = totalDetections

  const totalReviews = await models.Detection.count({
    where,
    include: [
      {
        as: 'reviews',
        model: models.DetectionReview,
        required: true
      }
    ]
  })
  statistics.totalVerified = totalReviews

  return statistics
}

module.exports = {
  getUploads,
  getAnnotations,
  getDetections
}
