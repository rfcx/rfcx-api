const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeBucketAttribute, aggregatedValueAttribute, timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')

function query (start, end, streamId, classifications, limit, offset) {
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
  return models.Detection
    .findAll({
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
      order: ['start']
    })
}

function timeAggregatedQuery (start, end, streamId, timeInterval, aggregateFunction, aggregateField, descending, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.stream_id = streamId
  }
  return models.Detection
    .findAll({
      where: condition,
      include: [
        {
          as: 'classification',
          model: models.Classification,
          attributes: models.Classification.attributes.lite,
          required: true
        }
      ],
      attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Detection', 'start'),
      offset: offset,
      limit: limit,
      order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
      group: [timeBucketAttribute].concat(models.Sequelize.col('classification.id')),
      raw: true,
      nest: true
    }).then(detections => detections.map(propertyToFloat(aggregatedValueAttribute)))
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
