const moment = require('moment')
const models = require('../../_models')
const { propertyToFloat } = require('../../_utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../_utils/db/time-aggregated-query')
const streamDao = require('../../streams/dao')
const { getAccessibleObjectsIDs, STREAM } = require('../../roles/dao')

/**
 * Combines query clauses based on input
 * @param {*} filters
 * @param {string} filters.streamId
 * @param {string} filters.start
 * @param {string} filters.end
 * @param {boolean} filters.streamsOnlyPublic
 * @param {object} filters.user
 * @param {string[]} filters.classifications
 * @param {*} options Additional options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {boolean} options.descending
 */
async function defaultQueryOptions (filters, options = {}) {
  const condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(filters.start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(filters.end).valueOf()
    }
  }
  if (filters.streamId !== undefined) {
    condition.stream_id = filters.streamId
  } else {
    const streamIds = filters.streamsOnlyPublic
      ? await streamDao.getPublicStreamIds()
      : await getAccessibleObjectsIDs(filters.user.id, STREAM)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
    }
  }
  const classificationCondition = filters.classifications === undefined
    ? {}
    : {
        value: { [models.Sequelize.Op.or]: filters.classifications }
      }
  const include = [{
    as: 'classification',
    model: models.Classification,
    where: classificationCondition,
    attributes: models.Classification.attributes.lite,
    required: true
  }]
  const attributes = [...models.Annotation.attributes.lite]
  return {
    where: condition,
    include,
    attributes,
    offset: options.offset,
    limit: options.limit,
    order: [['start', options.descending ? 'DESC' : 'ASC']]
  }
}

function formatFull (annotation) {
  return models.Annotation.attributes.full.reduce((acc, attribute) => {
    acc[attribute] = annotation[attribute]
    return acc
  }, {})
}

/**
 * Gets annotations based on input params
 * @param {*} filters
 * @param {string} filters.streamId
 * @param {string} filters.start
 * @param {string} filters.end
 * @param {boolean} filters.streamsOnlyPublic
 * @param {object} filters.user
 * @param {string | number} filters.streamsOnlyCreatedBy
 * @param {string[]} filters.classifications
 * @param {*} options Additional options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {boolean} options.descending
 */
async function query (filters, options = {}) {
  const queryOptions = await defaultQueryOptions(filters, options)
  return models.Annotation.findAll(queryOptions)
}

/**
 * Gets aggregated annotations based on input params
 * @param {*} filters
 * @param {string} filters.streamId
 * @param {string} filters.start
 * @param {string} filters.end
 * @param {boolean} filters.streamsOnlyPublic
 * @param {object} filters.user
 * @param {number} filters.createdBy
 * @param {string[]} filters.classifications
 * @param {*} options Additional options
 * @param {number} options.limit
 * @param {number} options.offset
 * @param {boolean} options.descending
 * @param {string} options.interval
 * @param {string} options.aggregate
 * @param {string} options.field
 */
async function timeAggregatedQuery (filters, options = {}) {
  const queryOptions = await defaultQueryOptions(filters, options)
  if (filters.createdBy !== undefined) {
    queryOptions.where.created_by_id = filters.createdBy
  }
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  queryOptions.attributes = timeAggregatedQueryAttributes(options.interval, options.aggregate, options.field, 'Annotation', 'start', timeBucketAttribute, aggregatedValueAttribute)
  queryOptions.order = [models.Sequelize.literal(timeBucketAttribute + (options.descending ? ' DESC' : ''))]
  queryOptions.group = [timeBucketAttribute].concat(models.Sequelize.col('classification.id'))
  queryOptions.raw = true
  queryOptions.nest = true
  return models.Annotation.findAll(queryOptions)
    .then(annotations => annotations.map(propertyToFloat(aggregatedValueAttribute)))
}

function create (annotation) {
  const { streamId, start, end, classificationId, frequencyMin, frequencyMax, userId } = annotation
  const where = {
    start,
    end,
    stream_id: streamId,
    classification_id: classificationId,
    created_by_id: userId
  }
  const defaults = {
    ...where,
    frequency_min: frequencyMin,
    frequency_max: frequencyMax,
    updated_by_id: userId
  }
  return models.Annotation.findOrCreate({ where, defaults }).spread((annotation, created) => formatFull(annotation))
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

function update (annotationId, start, end, classificationId, frequencyMin, frequencyMax, userId, isPositive) {
  return models.Annotation.findByPk(annotationId).then(annotation => {
    // Timescale time columns cannot be updated (outside of their "chunk interval")
    // so need to delete + create, while maintaining existing createdBy/At + streamId
    return models.sequelize.transaction(transaction => {
      return annotation.destroy({ transaction }).then(() => {
        return models.Annotation.create({
          ...annotation.toJSON(),
          classification_id: classificationId,
          start,
          end,
          frequency_min: frequencyMin,
          frequency_max: frequencyMax,
          updated_by_id: userId,
          updated_at: new Date()
        }, { transaction, silent: true })
      })
    })
  })
}

function remove (annotationId) {
  return get(annotationId).then(annotation => annotation.destroy())
}

module.exports = { query, timeAggregatedQuery, get, create, update, remove }
