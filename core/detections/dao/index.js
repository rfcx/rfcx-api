const { Sequelize, Stream, Classification, Classifier, DetectionReview, User, Detection } = require('../../_models')
const { propertyToFloat } = require('../../_utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../_utils/db/time-aggregated-query')
const pagedQuery = require('../../_utils/db/paged-query')
const streamDao = require('../../streams/dao')
const { getAccessibleObjectsIDs, STREAM, PROJECT } = require('../../roles/dao')
const { ValidationError } = require('../../../common/error-handling/errors')
const { REVIEW_STATUS_MAPPING } = require('./review')

const availableIncludes = [
  Stream.include(),
  Classifier.include(),
  Classification.include(),
  DetectionReview.include({
    separate: true, // to get all associated rows for hasMany relationship
    include: [
      User.include()
    ]
  })
]

async function defaultQueryOptions (filters = {}, options = {}) {
  if (!filters.start || !filters.end) {
    throw new ValidationError('"start" and "end" are required to query for detections')
  }
  const { start, end, streams, projects, classifiers, classifications, classifierJobs, minConfidence, reviewStatuses, streamsOnlyPublic } = filters
  const { user, offset, limit, descending, fields } = options

  const attributes = fields && fields.length > 0 ? Detection.attributes.full.filter(a => fields.includes(a)) : Detection.attributes.lite
  const include = fields && fields.length > 0 ? availableIncludes.filter(i => fields.includes(i.as)) : []

  const order = [['start', descending ? 'DESC' : 'ASC']]
  const where = {}
  if (start === end) {
    where.start = { [Sequelize.Op.eq]: start }
  } else {
    where.start = {
      [Sequelize.Op.gte]: start,
      [Sequelize.Op.lt]: end
    }
  }
  if (projects) {
    where['$stream.project_id$'] = user === undefined ? projects : await getAccessibleObjectsIDs(user.id, PROJECT, projects, 'R', true)
    if (!include.find(i => i.as === 'stream')) {
      include.push(availableIncludes.find(a => a.as === 'stream'))
    }
  }
  if (streams) {
    where.streamId = user === undefined ? streams : await getAccessibleObjectsIDs(user.id, STREAM, streams, 'R', true)
  } else if (!user.has_system_role) {
    const streamIds = streamsOnlyPublic
      ? await streamDao.getPublicStreamIds()
      : await getAccessibleObjectsIDs(user.id, STREAM)
    where.streamId = { [Sequelize.Op.in]: streamIds }
  }
  if (classifications) {
    where['$classification.value$'] = { [Sequelize.Op.or]: classifications }
  }
  // Always include classification so the query can group it by id
  include.push(availableIncludes.find(a => a.as === 'classification'))

  if (classifiers) {
    where.classifier_id = { [Sequelize.Op.or]: classifiers }
  }
  if (classifierJobs) {
    where.classifier_job_id = { [Sequelize.Op.in]: classifierJobs }
  }
  if (reviewStatuses !== undefined) {
    const statuses = reviewStatuses.map(s => REVIEW_STATUS_MAPPING[s])
    if (statuses.includes('null')) {
      if (statuses.length === 1) {
        where.reviewStatus = { [Sequelize.Op.eq]: null }
      } else {
        where.reviewStatus = { [Sequelize.Op.or]: { [Sequelize.Op.eq]: null, [Sequelize.Op.in]: statuses.filter(s => s !== 'null') } }
      }
    } else {
      where.reviewStatus = { [Sequelize.Op.in]: statuses }
    }
  }
  // TODO: if minConfidence is undefined, get it from event strategy
  where.confidence = { [Sequelize.Op.gte]: (minConfidence !== undefined ? minConfidence : 0.95) }
  return { where, include, attributes, offset, limit, order }
}

/**
 * Get a list of detections matching the filters
 * @param {*} filters Additional query options
 * @param {string[]} filters.streams Filter by one or more stream identifiers
 * @param {string[]} filters.projects Filter by one or more project identifiers
 * @param {string[]} filters.classifiers Filter by one or more classifier identifiers
 * @param {string[]} filters.classifications Filter by one or more classification values
 * @param {string[]} filters.minConfidence Filter by minimum confidence
 * @param {string[]} filters.isReviewed Filter by reviewed/unreviewed detections
 * @param {string[]} filters.isPositive Filter by approved/rejected detections
 * @param {*} options Additional get options
 * @param {number} options.readableBy Include only if the detection is accessible to the given user id
 * @param {string[]} options.fields Attributes and relations to include in results (defaults to lite attributes)
 * @param {boolean} options.descending Order the results in descending date order
 * @param {number} options.limit
 * @param {number} options.offset
 * @returns {Detection[]} Detections
 */
async function query (filters, options) {
  const opts = await defaultQueryOptions(filters, options)
  return await pagedQuery(Detection, opts)
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
    ...(await defaultQueryOptions({ start, end, streams, streamsOnlyPublic, classifications, minConfidence }, { descending, limit, offset, user })),
    attributes: timeAggregatedQueryAttributes(timeInterval, aggregateFunction, aggregateField, 'Detection', 'start', timeBucketAttribute, aggregatedValueAttribute),
    order: [Sequelize.literal(timeBucketAttribute + (descending ? ' DESC' : ''))],
    group: [timeBucketAttribute].concat(Sequelize.col('classification.id')),
    raw: true,
    nest: true
  }
  return Detection.findAll(queryOptions)
    .then(detections => detections.map(propertyToFloat(aggregatedValueAttribute)))
}

const DEFAULT_IGNORE_THRESHOLD = 0.5

module.exports = {
  availableIncludes,
  query,
  timeAggregatedQuery,
  DEFAULT_IGNORE_THRESHOLD
}
