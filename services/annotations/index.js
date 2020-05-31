const moment = require('moment')
const models = require('../../modelsTimescale')
const { toSnakeObject } = require('../../utils/formatters/snake-case')
const { propertyToFloat } = require('../../utils/formatters/object-properties')

function query (start, end, streamId, classificationIds, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.streamId = streamId
  }
  if (classificationIds !== undefined) {
    condition.classificationId = { [models.Sequelize.Op.or]: classificationIds }
  }
  return models.Annotation
    .findAll({
      where: condition,
      include: [
        {
          model: models.Classification,
          attributes: models.Classification.attributes.lite.filter(field => field !== 'id')
        }
      ],
      attributes: models.Annotation.attributes.lite,
      offset: offset,
      limit: limit,
      order: ['start']
    }).then(annotations => annotations.map(toSnakeObject))
}

const timeBucketAttribute = 'time_bucket'
const aggregatedValueAttribute = 'aggregated_value'
const timeAggregatedQueryAttributes = function (timeInterval, func, field, modelName, modelTimeField) {
  return [
    [models.Sequelize.fn('time_bucket', timeInterval, models.Sequelize.col(modelTimeField)), timeBucketAttribute],
    [models.Sequelize.fn(func, models.Sequelize.col(modelName + '.' + field)), aggregatedValueAttribute],
    [models.Sequelize.fn('min', models.Sequelize.col(modelTimeField)), 'first_' + modelTimeField]
  ]
}

function timeAggregatedQuery (start, end, streamId, timeInterval, aggregateFunction, aggregateField, descending, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.streamId = streamId
  }
  return models.Annotation
    .findAll({
      where: condition,
      include: [
        {
          model: models.Classification,
          attributes: models.Classification.attributes.lite,
          required: true
        }
      ],
      attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Annotation', 'start'),
      offset: offset,
      limit: limit,
      order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
      group: [timeBucketAttribute].concat(models.Sequelize.col('Classification.id')),
      raw: true,
      nest: true
    }).then(annotations => annotations.map(propertyToFloat(aggregatedValueAttribute)))
}

function create (streamId, start, end, classificationId, frequencyMin, frequencyMax, userId) {
  return models.Annotation.create({
    streamId, start, end, classificationId, frequencyMin, frequencyMax,
    createdBy: userId, updatedBy: userId
  })
}

function get (annotationId) {
  return models.Annotation.findByPk(annotationId)
}

function update (annotationId, start, end, classificationId, frequencyMin, frequencyMax, userId) {
  return get(annotationId).then(annotation => {
    // Timescale time columns cannot be updated (outside of their "chunk interval")
    // so need to delete + create, while maintaining existing createdBy/At + streamId
    return models.sequelize.transaction(transaction => {
      return annotation.destroy({ transaction }).then(() => {
        return models.Annotation.create({
          id: annotationId, streamId: annotation.streamId,
          start, end, classificationId, frequencyMin, frequencyMax,
          createdAt: annotation.createdAt, createdBy: annotation.createdBy, updatedAt: new Date, updatedBy: userId
        }, { transaction, silent: true })
      })
    })
  })
}

function remove (annotationId) {
  return get(annotationId).then(annotation => annotation.destroy())
}

module.exports = { query, timeAggregatedQuery, get, create, update, remove }
