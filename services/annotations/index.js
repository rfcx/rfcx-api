const moment = require('moment')
const models = require('../../modelsTimescale')
const { toSnakeObject } = require('../../utils/formatters/snake-case')
const { propertyToFloat } = require('../../utils/formatters/object-properties')

function formatFull (annotation) {
  return models.Annotation.attributes.full.reduce((acc, attribute) => {
    acc[attribute] = annotation[attribute]
    return acc
  }, {})
}

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
  return models.Annotation
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
    [models.Sequelize.fn('min', models.Sequelize.col(modelTimeField)), 'first_' + modelTimeField],
    [models.Sequelize.fn('max', models.Sequelize.col(modelTimeField)), 'last_' + modelTimeField]
  ]
}

function timeAggregatedQuery (start, end, streamId, createdById, timeInterval, aggregateFunction, aggregateField, descending, limit, offset) {
  let condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamId !== undefined) {
    condition.stream_id = streamId
  }
  if (createdById !== undefined) {
    condition.created_by_id = createdById
  }
  return models.Annotation
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
      attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Annotation', 'start'),
      offset: offset,
      limit: limit,
      order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
      group: [timeBucketAttribute].concat(models.Sequelize.col('classification.id')),
      raw: true,
      nest: true
    }).then(annotations => annotations.map(propertyToFloat(aggregatedValueAttribute)))
}

function create (annotation) {
  const { streamId, start, end, classificationId, frequencyMin, frequencyMax, userId } = annotation
  return models.Annotation.create({
    start, end,
    stream_id: streamId,
    classification_id: classificationId,
    frequency_min: frequencyMin,
    frequency_max: frequencyMax,
    created_by_id: userId,
    updated_by_id: userId
  }).then(annotation => formatFull(annotation))
}

function get (annotationId) {
  return models.Annotation.findByPk(annotationId, {
    include: [
      {
        as: 'classification',
        model: models.Classification,
        attributes: models.Classification.attributes.lite,
        required: true
      },
      {
        as: 'created_by',
        model: models.User,
        attributes: models.User.attributes.lite
      },
      {
        as: 'updated_by',
        model: models.User,
        attributes: models.User.attributes.lite
      }
    ],
    attributes: models.Annotation.attributes.full
  })
}

function update (annotationId, start, end, classificationId, frequencyMin, frequencyMax, userId) {
  return models.Annotation.findByPk(annotationId).then(annotation => {
    // Timescale time columns cannot be updated (outside of their "chunk interval")
    // so need to delete + create, while maintaining existing createdBy/At + streamId
    return models.sequelize.transaction(transaction => {
      return annotation.destroy({ transaction }).then(() => {
        return models.Annotation.create({
          ...annotation.toJSON(), classification_id: classificationId,
          start, end, frequency_min: frequencyMin, frequency_max: frequencyMax,
          updated_by_id: userId, updated_at: new Date
        }, { transaction, silent: true })
      })
    })
  })
}

function remove (annotationId) {
  return get(annotationId).then(annotation => annotation.destroy())
}

module.exports = { query, timeAggregatedQuery, get, create, update, remove }
