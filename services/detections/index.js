const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')
const streamsService = require('../streams')

async function defaultQueryOptions (start, end, streamId, streamsOnlyCreatedBy, streamsOnlyPublic, classifications, minConfidence, descending, limit, offset, user) {
  const condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.stream_id = streamId
  } else {
    const streamIds = streamsOnlyPublic
      ? await streamsService.getPublicStreamIds()
      : await streamsService.getAccessibleStreamIds(user, streamsOnlyCreatedBy)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
    }
  }

  const classificationCondition = classifications === undefined ? {}
    : {
      value: { [models.Sequelize.Op.or]: classifications }
    }

  // TODO: if minConfidence is undefined, get it from event strategy
  condition.confidence = { [models.Sequelize.Op.gte]: (minConfidence !== undefined ? minConfidence : 0.95) }
  return {
    where: condition,
    include: [
      {
        as: 'classification',
        model: models.Classification,
        where: classificationCondition,
        attributes: models.Classification.attributes.lite,
        required: true
      },
      {
        as: 'classifier',
        model: models.Classifier,
        attributes: [],
        required: true
      }
    ],
    attributes: models.Detection.attributes.lite,
    offset: offset,
    limit: limit,
    order: [['start', descending ? 'DESC' : 'ASC']]
  }
}

async function query (start, end, streamId, classifications, minConfidence, limit, offset, user) {
  const opts = await defaultQueryOptions(start, end, streamId, undefined, false, classifications, minConfidence, false, limit, offset, user)
  return models.Detection.findAll(opts)
}

async function timeAggregatedQuery (start, end, streamId, streamsOnlyCreatedBy, streamsOnlyPublic, timeInterval, aggregateFunction, aggregateField, minConfidence, descending, limit, offset, user) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...(await defaultQueryOptions(start, end, streamId, streamsOnlyCreatedBy, streamsOnlyPublic, undefined, minConfidence, descending, limit, offset, user)),
    attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Detection', 'start', timeBucketAttribute, aggregatedValueAttribute),
    order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
    group: [timeBucketAttribute].concat(models.Sequelize.col('classification.id')),
    raw: true,
    nest: true
  }
  return models.Detection.findAll(queryOptions)
    .then(detections => detections.map(propertyToFloat(aggregatedValueAttribute)))
}

function create (detections) {
  return models.Detection.bulkCreate(
    detections.map(d => ({
      stream_id: d.streamId,
      classification_id: d.classificationId,
      classifier_id: d.classifierId,
      start: d.start,
      end: d.end,
      confidence: d.confidence
    })))
}

function matchDetectionsWithReviews (detections, reviews) {
  detections = detections.map(d => {
    return {
      ...d.toJSON(),
      reviews: []
    }
  })
  reviews.forEach((r) => {
    r = r.toJSON()
    const detection = detections.find((d) => {
      return r.start.valueOf() === d.start.valueOf() && r.end.valueOf() === d.end.valueOf() &&
        r.stream_id === d.stream_id && r.classification.value === d.classification.value
    })
    if (detection) {
      detection.reviews.push({
        positive: r.is_positive,
        user: r.created_by
      })
    }
  })
  return detections
}

module.exports = {
  query,
  timeAggregatedQuery,
  create,
  matchDetectionsWithReviews
}
