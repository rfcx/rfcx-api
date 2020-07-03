const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeBucketAttribute, aggregatedValueAttribute, timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')

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
      attributes: models.Annotation.attributes.lite,
      offset: offset,
      limit: limit,
      order: [['start', descending ? 'DESC' : 'ASC']]
  }
}

function formatFull (annotation) {
  return models.Annotation.attributes.full.reduce((acc, attribute) => {
    acc[attribute] = annotation[attribute]
    return acc
  }, {})
}

function query (start, end, streamId, classifications, limit, offset) {
  const queryOptions = defaultQueryOptions(start, end, streamId, classifications, false, limit, offset)
  return models.Annotation.findAll(queryOptions)
}

function timeAggregatedQuery (start, end, streamId, createdById, timeInterval, aggregateFunction, aggregateField, descending, limit, offset) {
  let queryOptions = defaultQueryOptions(start, end, streamId, undefined, descending, limit, offset)
  if (createdById !== undefined) {
    queryOptions.where.created_by_id = createdById
  }
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  queryOptions.attributes = timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Annotation', 'start', timeBucketAttribute, aggregatedValueAttribute)
  queryOptions.order = [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))]
  queryOptions.group = [timeBucketAttribute].concat(models.Sequelize.col('classification.id'))
  queryOptions.raw = true
  queryOptions.nest = true
  return models.Annotation.findAll(queryOptions)
    .then(annotations => annotations.map(propertyToFloat(aggregatedValueAttribute)))
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
