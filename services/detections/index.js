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
 * @param {string | string[]} streamIds Stream id or list of stream ids
 * @param {string | string[]} projectIds Project id or list of project ids
 * @param {string | string[]} classifierIds Classifier id or list of classifier ids
 * @param {string | string[]} classifications Classification or list of classifications
 * @param {number} minConfidence Minimum confidence to query detections
 * @param {boolean} isReviewed
 * @param {boolean} isPositive
 * @param {number} limit Maximum number to get detections
 * @param {number} offset Number of resuls to skip
 * @param {object} user
 * @returns {Detection[]} Detections
 */
async function reviewQuery (opts, user) {
  const { start, end, streamIds, projectIds, classifierIds, classifications, minConfidence, isReviewed, isPositive, limit, offset } = opts
  let conditions = 'WHERE d.start > $start AND d.end < $end'
  const userId = user.id

  if (streamIds) {
    conditions = conditions + ' AND d.stream_id = ANY($streamIds)'
  }

  if (projectIds) {
    conditions = conditions + ' AND s.project_id = ANY($projectIds)'
  }

  if (classifierIds) {
    conditions = conditions + ' AND s.project_id = ANY($classifierIds)'
  }

  if (classifications) {
    conditions = conditions + ' AND c.value = ANY($classifications)'
  }

  if (minConfidence) {
    conditions = conditions + ' AND d.confidence >= $minConfidence'
  }

  if (isPositive) {
    conditions = conditions + ' AND a.is_positive'
  }

  if (isPositive === false) {
    conditions = conditions + ' AND NOT a.is_positive'
  }

  if (isReviewed) {
    conditions = conditions + ' AND a.is_positive IS NOT null'
  }

  if (isReviewed === false) {
    conditions = conditions + ' AND a.is_positive IS null'
  }

  const sql =
    `
      SELECT d.start, d.end, d.classification_id, (c.value) classification_value, (c.title) classification_title,
      d.classifier_id, (clf.external_id) classifier_external_id, (clf.name) classifier_name, (clf.version) classifier_version,
      d.stream_id, (s.name) stream_name, d.confidence,
      SUM(CASE WHEN a.is_positive IS NOT null THEN 1 ELSE 0 END) total,
      SUM(CASE WHEN a.is_positive THEN 1 ELSE 0 END) number_of_positive,
      SUM(CASE WHEN a.created_by_id = $userId AND a.is_positive then 1 ELSE 0 END) me_positive,
      SUM(CASE WHEN a.created_by_id = 1 AND a.is_positive = false THEN 1 ELSE 0 END) me_negative
      FROM detections d
      JOIN streams s ON d.stream_id = s.id
      JOIN classifications c ON d.classification_id = c.id
      JOIN classifiers clf ON d.classifier_id = clf.id
      LEFT JOIN annotations a ON d.stream_id = a.stream_id AND d.classification_id = a.classification_id AND d.start >= a.start AND d.end <= a.end
      ${conditions}
      GROUP BY d.start, d.end, d.classification_id, c.value, c.title, d.classifier_id, clf.name, clf.version, clf.external_id, d.stream_id, s.name, d.confidence
      LIMIT $limit
      OFFSET $offset
    `
  const results = await models.sequelize.query(sql, { bind: { start, end, streamIds, projectIds, classifierIds, classifications, minConfidence, limit, offset, userId }, type: models.sequelize.QueryTypes.SELECT })

  return results.map(review => {
    const total = Number(review.total)
    const positive = Number(review.number_of_positive)
    return {
      start: review.start,
      end: review.end,
      stream: {
        id: review.stream_id,
        name: review.stream_name
      },
      classifier: {
        id: review.classifier_id,
        external_id: review.classifier_external_id,
        name: review.classifier_name,
        version: review.classifier_version
      },
      classification: {
        id: review.classification_id,
        value: review.classification_value,
        title: review.classification_title
      },
      confidence: review.confidence,
      number_of_reviewed: total,
      number_of_positive: positive,
      number_of_negative: total - positive,
      me_reviewed: review.me_positive === 0 || review.me_negative === 0,
      me_positive: review.me_positive !== 0 && review.me_negative === 0,
      me_negative: review.me_negative !== 0 && review.me_positive === 0
    }
  })
}

const DEFAULT_IGNORE_THRESHOLD = 0.5

module.exports = {
  query,
  timeAggregatedQuery,
  reviewQuery,
  create,
  DEFAULT_IGNORE_THRESHOLD
}
