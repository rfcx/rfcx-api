const { Sequelize, Stream, Classification, Classifier, DetectionReview, User, Detection, ClassifierJob, BestDetection, sequelize } = require('../../_models')
const { propertyToFloat } = require('../../_utils/formatters/object-properties')
const { timeAggregatedQueryAttributes } = require('../../_utils/db/time-aggregated-query')
const pagedQuery = require('../../_utils/db/paged-query')
const streamDao = require('../../streams/dao')
const { toCamelObject } = require('../../_utils/formatters/string-cases')
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

function reviewStatusesFilter (sourceReviewStatuses) {
  const statuses = sourceReviewStatuses.map(s => REVIEW_STATUS_MAPPING[s])

  if (statuses.includes('null')) {
    if (statuses.length === 1) {
      return { [Sequelize.Op.eq]: null }
    } else {
      return { [Sequelize.Op.or]: { [Sequelize.Op.eq]: null, [Sequelize.Op.in]: statuses.filter(s => s !== 'null') } }
    }
  } else {
    return { [Sequelize.Op.in]: statuses }
  }
}

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
    where.streamId = streamIds
  }
  if (classifications) {
    where['$classification.value$'] = classifications
  }
  // Always include classification so the query can group it by id
  include.push(availableIncludes.find(a => a.as === 'classification'))

  if (classifiers) {
    where.classifier_id = classifiers
  }
  if (classifierJobs) {
    where.classifier_job_id = classifierJobs
  }
  if (reviewStatuses !== undefined) {
    where.reviewStatus = reviewStatusesFilter(reviewStatuses)
  }
  // TODO: if minConfidence is undefined, get it from event strategy
  where.confidence = { [Sequelize.Op.gte]: (minConfidence !== undefined ? minConfidence : 0.95) }
  return { where, include, attributes, offset, limit, order }
}

/**
 * Get a list of best detections matching the filters
 * @param {*} filters Query options
 * @param {number} filters.classifierJobId Job Id for which we want to find the best detections
 * @param {string[]} filters.streams Filter by one or more stream identifiers
 * @param {boolean} filters.byDate find best results for each date
 * @param {Date} filters.start Find detections with start >= filters.start
 * @param {Date} filters.end Find detections with start < filters.end
 * @param {string[]} filters.reviewStatuses Filter by review status = passed status
 * @param {number} filters.nPerStream Maximum number of results per stream (and per day if by_date is set)
 * @param {*} options Additional get options
 * @param {User} options.user User that is requesting detections
 * @returns {Detection[]} Detections
 */
async function queryBestDetections (filters, opts) {
  const { user, limit, offset } = opts
  const { streams, reviewStatuses } = filters
  const where = {}
  const bestDetectionsWhere = { classifierJobId: filters.classifierJobId }
  const attributes = Detection.attributes.lite

  bestDetectionsWhere.start = {
    [Sequelize.Op.gte]: filters.start,
    [Sequelize.Op.lt]: filters.end
  }

  if (!filters.start || !filters.end) {
    const existingJob = await ClassifierJob.findOne({
      where: { id: filters.classifierJobId },
      attributes: ['query_start', 'query_end']
    })
    let job = existingJob.toJSON()
    job = toCamelObject(job, 2)

    bestDetectionsWhere.start[Sequelize.Op.gte] = filters.start || job.queryStart
    bestDetectionsWhere.start[Sequelize.Op.lt] = filters.end || job.queryEnd
  }
  where.start = bestDetectionsWhere.start

  if (streams) {
    bestDetectionsWhere.streamId = user === undefined ? streams : await getAccessibleObjectsIDs(user.id, STREAM, streams, 'R', true)
  } else if (!user.has_system_role) {
    const streamIds = await getAccessibleObjectsIDs(user.id, STREAM)
    bestDetectionsWhere.streamId = streamIds
  }

  if (reviewStatuses !== undefined) {
    where.reviewStatus = reviewStatusesFilter(reviewStatuses)
  }

  const include = [Classification.include()]
  // no end and no start defined
  const usesFullJobLength = !(filters.start || filters.end)

  // if the date is set for 'best per stream id'
  if (!usesFullJobLength && !filters.byDate) {
    throw new ValidationError('Searching for the best detections of job does not support date range')
  }

  let order = []
  if (filters.byDate) {
    bestDetectionsWhere.dailyRanking = { [Sequelize.Op.lte]: filters.nPerStream }

    include.push({
      model: BestDetection,
      required: true,
      as: 'bestDetection',
      attributes: ['daily_ranking', 'stream_ranking'],
      where: bestDetectionsWhere,
      on: {
        start: sequelize.where(sequelize.col('Detection.start'), Sequelize.Op.eq, sequelize.col('bestDetection.start')),
        detectionId: sequelize.where(sequelize.col('Detection.id'), Sequelize.Op.eq, sequelize.col('bestDetection.detection_id'))
      }
    })

    order = [
      [sequelize.fn('date', sequelize.fn('timezone', 'UTC', sequelize.col('Detection.start'))), 'ASC'],
      ['stream_id', 'ASC'],
      [{ model: BestDetection, as: 'bestDetection' }, 'daily_ranking', 'ASC']
    ]
  } else {
    bestDetectionsWhere.streamRanking = { [Sequelize.Op.lte]: filters.nPerStream }

    include.push({
      model: BestDetection,
      required: true,
      where: bestDetectionsWhere,
      attributes: ['daily_ranking', 'stream_ranking'],
      order: ['stream_ranking'],
      as: 'bestDetection',
      on: {
        on1: sequelize.where(sequelize.col('Detection.start'), Sequelize.Op.eq, sequelize.col('bestDetection.start')),
        on2: sequelize.where(sequelize.col('Detection.id'), Sequelize.Op.eq, sequelize.col('bestDetection.detection_id'))
      }
    })

    order = [
      ['stream_id', 'ASC'],
      [{ model: BestDetection, as: 'bestDetection' }, 'stream_ranking', 'ASC']
    ]
  }

  return await pagedQuery(Detection, {
    where,
    attributes,
    include,
    order,
    limit,
    offset
  })
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

/**
 * Get a count of detections based on given where options.
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
 * @returns {Record<'unreviewed' | 'rejected' | 'uncertain' | 'confirmed', number>} Detection counts
 */
async function queryDetectionsSummary (filters, options) {
  const opts = await defaultQueryOptions(filters, options)
  const includesWithoutAdditionalColumns = opts.include.map(i => {
    return {
      ...i,
      attributes: []
    }
  })

  /**
   * @type Array<{ review_status: 'null' | -1 | 0 | 1, count: number }>
   */
  const counts = await Detection.findAll({
    attributes: [
      'review_status',
      [sequelize.literal('COUNT(1)::integer'), 'count']
    ],
    where: opts.where,
    include: includesWithoutAdditionalColumns,
    group: ['"Detection"."review_status"'],
    raw: true
  })

  /**
   * @type Record<'null' | -1 | 0 | 1, number | undefined>
   */
  const result = {}

  counts.forEach(count => {
    result[count.review_status] = count.count
  })

  return {
    unreviewed: result[REVIEW_STATUS_MAPPING.unreviewed] || 0,
    rejected: result[REVIEW_STATUS_MAPPING.rejected] || 0,
    uncertain: result[REVIEW_STATUS_MAPPING.uncertain] || 0,
    confirmed: result[REVIEW_STATUS_MAPPING.confirmed] || 0
  }
}

const DEFAULT_IGNORE_THRESHOLD = 0.5

module.exports = {
  availableIncludes,
  query,
  queryBestDetections,
  timeAggregatedQuery,
  queryDetectionsSummary,
  DEFAULT_IGNORE_THRESHOLD
}
