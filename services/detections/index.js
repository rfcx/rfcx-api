const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')
const streamPermissionService = require('../streams-timescale/permission')

async function defaultQueryOptions (start, end, streamId, classifications, minConfidence, descending, limit, offset, userId) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.stream_id = streamId
  }
  else {
    const streamIds = await streamPermissionService.getAccessibleStreamIds(userId)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
    }
  }

  const classificationCondition = classifications === undefined ? {} :
    {
      value: { [models.Sequelize.Op.or]: classifications }
    }

  if (minConfidence === undefined) {
    condition.confidence = { [models.Sequelize.Op.gte]: models.Sequelize.literal('classifier.min_confidence') }
  }
  else {
    condition.confidence = { [models.Sequelize.Op.gte]: minConfidence }
  }

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

async function query (start, end, streamId, classifications, minConfidence, reviews, limit, offset, userId) {
  let opts = await defaultQueryOptions(start, end, streamId, classifications, minConfidence, false, limit, offset, userId)
  if (reviews) {
    opts.include.push({
      as: 'reviews',
      model: models.DetectionReview,
      include: [
        {
          as: 'user',
          model: models.User,
          attributes: models.User.attributes.lite
        }
      ],
      attributes: ['positive', 'created_at']
    })
  }
  return models.Detection.findAll(opts)
}

async function timeAggregatedQuery (start, end, streamId, timeInterval, aggregateFunction, aggregateField, minConfidence, descending, limit, offset, userId) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...(await defaultQueryOptions(start, end, streamId, undefined, minConfidence, descending, limit, offset, userId)),
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

function get (detectionId) {
  return models.Detection.findByPk(detectionId, {
    include: [
      {
        as: 'classification',
        model: models.Classification,
        attributes: models.Classification.attributes.lite,
        required: true
      },
      {
        as: 'stream',
        model: models.Stream,
        attributes: models.Stream.attributes.lite
      },
      {
        as: 'classifier',
        model: models.Classifier,
        attributes: models.Classifier.attributes.lite
      }
    ],
    attributes: models.Detection.attributes.full
  })
}

module.exports = { query, timeAggregatedQuery, get, create }
