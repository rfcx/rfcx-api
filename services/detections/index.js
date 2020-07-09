const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')

function defaultQueryOptions (start, end, streamId, classifications, descending, limit, offset) {
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
  return {
      where: condition,
      include: [
        {
          as: 'classification',
          model: models.Classification,
          where: classificationCondition,
          attributes: models.Classification.attributes.lite,
          required: true
        }
      ],
      attributes: models.Detection.attributes.lite,
      offset: offset,
      limit: limit,
      order: [['start', descending ? 'DESC' : 'ASC']]
    }
}

function query (start, end, streamId, classifications, limit, offset) {
  return models.Detection.findAll(defaultQueryOptions(start, end, streamId, classifications, false, limit, offset))
}

function timeAggregatedQuery (start, end, streamId, timeInterval, aggregateFunction, aggregateField, descending, limit, offset) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...defaultQueryOptions(start, end, streamId, undefined, descending, limit, offset),
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
