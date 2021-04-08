const moment = require('moment')
const models = require('../../modelsTimescale')
const { propertyToFloat } = require('../../utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../utils/timeseries/time-aggregated-query')
const streamsService = require('../streams')

/**
 * Get a list of detections
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streamIdOrIds Stream id or list of stream ids
 * @param {object} streamsOnlyCreatedBy
 * @param {boolean} streamsOnlyPublic
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} descending
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @returns {Detection[]} Detections
 */
async function defaultQueryOptions (start, end, streamIdOrIds, streamsOnlyCreatedBy, streamsOnlyPublic, classifications, minConfidence, descending, limit, offset, user) {
  const condition = {
    start: {
      [models.Sequelize.Op.gte]: moment.utc(start).valueOf(),
      [models.Sequelize.Op.lt]: moment.utc(end).valueOf()
    }
  }
  if (streamIdOrIds !== undefined) {
    condition.stream_id = streamIdOrIds
  } else {
    const streamIds = streamsOnlyPublic
      ? await streamsService.getPublicStreamIds()
      : await streamsService.getAccessibleStreamIds(user, streamsOnlyCreatedBy)
    condition.stream_id = {
      [models.Sequelize.Op.in]: streamIds
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
 * @returns {Detection[]} Detections
 */
async function query (start, end, streamIdOrIds, classifications, minConfidence, limit, offset, user) {
  const opts = await defaultQueryOptions(start, end, streamIdOrIds, undefined, false, classifications, minConfidence, false, limit, offset, user)
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

/**
 * Get a list of detections
 * @param {string} start
 * @param {string} end
 * @param {string | string[]} streamIdOrIds Stream id or list of stream ids
 * @param {string | string[]} projetcs Project id or list of project ids
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} isReviewed
 * @param {boolean} isPositive
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @returns {Detection[]} Detections
 */
async function reviewQuery (start, end, streamIdOrIds, projetcs, classifications, minConfidence, isReviewed, isPositive, limit, offset) {
  const sql =
    `SELECT * FROM detections
      LEFT JOIN annotations ON detections.start = annotations.start
      AND detections.end = annotations.end
      AND detections.stream_id = annotations.stream_id
      AND detections.classification_id = annotations.classification_id
    `
  return models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT })
}

const DEFAULT_IGNORE_THRESHOLD = 0.5

module.exports = {
  query,
  timeAggregatedQuery,
  reviewQuery,
  create,
  DEFAULT_IGNORE_THRESHOLD
}
