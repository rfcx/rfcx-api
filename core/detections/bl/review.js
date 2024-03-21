const { sequelize } = require('../../_models')
const { hasPermission, UPDATE, STREAM } = require('../../roles/dao')
const { ForbiddenError, EmptyResultError } = require('../../../common/error-handling/errors')
const { query } = require('../dao/index')
const { update } = require('../dao/update')
const reviewsDao = require('../dao/review')
const classifierJobResultsDao = require('../../classifier-jobs/dao/summary')

async function createOrUpdate (options) {
  const { streamId, start, userId, classification, classifier, classifierJob } = options

  if (userId && !(await hasPermission(UPDATE, userId, streamId, STREAM))) {
    throw new ForbiddenError('You do not have permission to review detections in this stream.')
  }
  const where = {
    start,
    end: start,
    streams: [streamId],
    classifications: [classification],
    classifiers: [classifier],
    minConfidence: 0
  }
  if (classifierJob) {
    where.classifierJobs = [classifierJob]
  }
  const detections = await query(where, { fields: ['id', 'classification_id', 'classifier_job_id'] })
  if (!detections.length) {
    throw new EmptyResultError('Detection with given parameters not found')
  }
  const status = reviewsDao.REVIEW_STATUS_MAPPING[options.status]
  return sequelize.transaction(async (transaction) => {
    for (const detection of detections) {
      let review = (await reviewsDao.query({ detectionIds: [detection.id], userId }, { fields: ['id'], transaction }))[0]
      const exists = !!review
      if (exists) {
        await reviewsDao.update(review.id, { status }, { transaction })
      } else {
        review = await reviewsDao.create({ detectionId: detection.id, userId, status }, { transaction })
      }
      await refreshDetectionReviewStatus(detection.id, streamId, start, transaction)
    }
    const classificationId = detections[0].classification_id // we have only single classification here, so we can get id from the first item
    const classifierJobIds = [...new Set(detections.filter(d => !!d.classifier_job_id).map(d => d.classifier_job_id))]
    for (const classifierJobId of classifierJobIds) {
      await classifierJobResultsDao.incrementJobSummaryMetric({ classifierJobId, classificationId }, { field: options.status }, { transaction })
    }
  })
}

async function refreshDetectionReviewStatus (detectionId, streamId, start, transaction) {
  const { n, u, p } = await countReviewsForDetection(detectionId, transaction)
  const reviewStatus = calculateReviewStatus(n, u, p)
  await update(streamId, start, { reviewStatus }, { transaction })
}

async function countReviewsForDetection (detectionId, transaction) {
  const reviews = await reviewsDao.query({ detectionIds: [detectionId] }, { fields: ['status'], transaction })
  // eslint-disable-next-line quote-props
  const counts = reviews.reduce((acc, cur) => { acc[`${cur.status}`]++; return acc }, { '-1': 0, '0': 0, '1': 0 })
  const n = counts['-1']
  const u = counts['0']
  const p = counts['1']
  return { n, u, p }
}

function calculateReviewStatus (n, u, p) {
  if (n > u && n > p) {
    return -1
  } else if (p > u && p > n) {
    return 1
  } else if (n === 0 && u === 0 && p === 0) { // all reviews are updated to unreviewed
    return null
  } else {
    return 0
  }
}

module.exports = {
  createOrUpdate,
  calculateReviewStatus
}
