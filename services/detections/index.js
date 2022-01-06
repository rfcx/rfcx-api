const moment = require('moment')
const models = require('../../models')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')
const streamsService = require('../streams')
const { getAccessibleObjectsIDs, STREAM } = require('../roles')

/**
 * Get a list of detections
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streamIdOrIds Stream id or list of stream ids
 * @param {boolean} streamsOnlyPublic
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} descending
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @returns {Detection[]} Detections
 */
async function defaultQueryOptions (start, end, streamIdOrIds, streamsOnlyPublic, classifications, minConfidence, descending, limit, offset, user, classifiers) {
  const condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamIdOrIds !== undefined) {
    condition.stream_id = user.has_system_role || user.has_stream_token ? [streamIdOrIds] : await getAccessibleObjectsIDs(user.id, STREAM, streamIdOrIds)
  } else if (!user.has_system_role) {
    const streamIds = streamsOnlyPublic
      ? await streamsService.getPublicStreamIds()
      : await getAccessibleObjectsIDs(user.id, STREAM)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
    }
  }

  if (classifiers !== undefined) {
    condition.classifier_id = {
      [models.Sequelize.Op.in]: classifiers
    }
  }

  const classificationCondition = classifications === undefined
    ? {}
    : { value: { [models.Sequelize.Op.or]: classifications } }

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

/**
 * Get a list of detections
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streamIdOrIds Stream id or list of stream ids
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @param {string | string[]} classifiers Classifier or list of classifiers
 * @returns {Detection[]} Detections
 */
async function query (start, end, streamIdOrIds, classifications, minConfidence, limit, offset, user, classifiers) {
  const opts = await defaultQueryOptions(start, end, streamIdOrIds, false, classifications, minConfidence, false, limit, offset, user, classifiers)
  const detections = await models.Detection.findAll(opts)
  return detections.map(d => d.toJSON())
}

/**
 * Get a list of clustered detections
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streams Stream id or list of stream ids
 * @param {string} streamsOnlyPublic Public streams
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {string} timeInterval Time interval for aggregate results
 * @param {string} aggregateFunction Aggregate function to apply
 * @param {string} aggregateField Column or field to apply the function
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} descending Order the result by descending time
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @returns {ClusteredDetection[]} Clustered detections
 */
async function timeAggregatedQuery (start, end, streams, streamsOnlyPublic, classifications, timeInterval, aggregateFunction, aggregateField, minConfidence, descending, limit, offset, user) {
  const timeBucketAttribute = 'time_bucket'
  const aggregatedValueAttribute = 'aggregated_value'
  const queryOptions = {
    ...(await defaultQueryOptions(start, end, streams, streamsOnlyPublic, classifications, minConfidence, descending, limit, offset, user)),
    attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Detection', 'start', timeBucketAttribute, aggregatedValueAttribute),
    order: [models.Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
    group: [timeBucketAttribute].concat(models.Sequelize.col('classification.id')),
    raw: true,
    nest: true
  }
  return models.Detection.findAll(queryOptions)
    .then(detections => detections.map(propertyToFloat(aggregatedValueAttribute)))
}

const DEFAULT_IGNORE_THRESHOLD = 0.5

module.exports = {
  query,
  timeAggregatedQuery,
  DEFAULT_IGNORE_THRESHOLD
}
