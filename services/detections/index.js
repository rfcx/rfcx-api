const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')

function defaultQueryOptions (start, end, streamId, classifications, minConfidence, descending, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.stream_id = streamId
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

function query (start, end, streamId, classifications, minConfidence, limit, offset) {
  return models.Detection.findAll(defaultQueryOptions(start, end, streamId, classifications, minConfidence, false, limit, offset))
}

function timeAggregatedQuery (start, end, streamId, timeInterval, aggregateFunction, aggregateField, minConfidence, descending, limit, offset) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...defaultQueryOptions(start, end, streamId, undefined, minConfidence, descending, limit, offset),
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
      }
      // TODO: include classifier and stream
    ],
    attributes: models.Detection.attributes.full
  })
}


module.exports = { query, timeAggregatedQuery, get, create }
