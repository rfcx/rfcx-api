const { sequelize, DetectionReview } = require('../../_models')
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
  const detections = (await query(where, { fields: ['id', 'classification_id', 'classifier_job_id', 'review_status'] })).results
  if (!detections.length) {
    throw new EmptyResultError('Detection with given parameters not found')
  }
  const status = reviewsDao.REVIEW_STATUS_MAPPING[options.status]
  const finalReviewStatuses = sequelize.transaction(async (transaction) => {
    /**
     * @type {Array<{ id: number, status: 'unreviewed' | 'rejected' | 'uncertain' | 'confirmed'}>}
     */
    const finalReviewStatuses = []

    for (const detection of detections) {
      let review = (await reviewsDao.query({ detectionIds: [detection.id], userId }, { fields: ['id'], transaction }))[0]
      const exists = !!review
      if (exists) {
        if (status === 'null') {
          await reviewsDao.remove(review.id, { transaction })
        } else {
          await reviewsDao.update(review.id, { status }, { transaction })
        }
      } else {
        if (status !== 'null') {
          review = await reviewsDao.create({ detectionId: detection.id, userId, status }, { transaction })
        }
      }

      /**
       * @type {{ start: string, streamId: string, id: string }}
       */
      const whereOptionsToUpdate = {
        start,
        streamId,
        id: detection.id
      }

      const updatedStatus = await refreshDetectionReviewStatus(detection.id, whereOptionsToUpdate, transaction)
      finalReviewStatuses.push({
        id: detection.id,
        status: DetectionReview.statusMapping[`${updatedStatus}`] === 'null' ? 'unreviewed' : DetectionReview.statusMapping[`${updatedStatus}`]
      })

      // Update summary if reviewStatus changed
      if (updatedStatus !== detection.review_status) {
        const updatedStatusLabel = DetectionReview.statusMapping[`${updatedStatus}`] // used for increment
        const currentStatusLabel = DetectionReview.statusMapping[`${detection.review_status}`] // used for decrement
        const classifierJobId = detection.classifier_job_id
        const classificationId = detection.classification_id
        if (!classifierJobId || !classificationId) { // won't update summary if either classifier_job_id or classification_id is null or undefined
          continue
        }
        if (currentStatusLabel !== 'null') {
          await classifierJobResultsDao.decrementJobSummaryMetric({ classifierJobId, classificationId }, { field: currentStatusLabel }, { transaction })
        }
        if (updatedStatusLabel !== 'null') {
          await classifierJobResultsDao.incrementJobSummaryMetric({ classifierJobId, classificationId }, { field: updatedStatusLabel }, { transaction })
        }
      }
    }

    return finalReviewStatuses
  })

  return finalReviewStatuses
}

/**
 * Refresh the review status of the detection inside `detections` table reflected from
 * reviews from multiple persons inside `detection_reviews` table.
 * @param {string} detectionId the detection id
 * @param {object} where where options the same as the where clause used to find the detection to update
 * @param {object} transaction Sequelize's transaction object
 *
 * @returns {Promise<-1 | 1 | null | 0>} final review status
 */
async function refreshDetectionReviewStatus (detectionId, where, transaction) {
  const { n, u, p } = await countReviewsForDetection(detectionId, transaction)
  const reviewStatus = calculateReviewStatus(n, u, p)
  await update(where.streamId, where.id, where.start, { reviewStatus }, { transaction })
  return reviewStatus
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

/**
 * Calculates the review status of the detection from multiple reviewers.
 * @param {number} n count of reviews by users marked as `rejected`
 * @param {number} u count of reviews by users marked as `uncertain`
 * @param {number} p count of reviews by users marked as `confirmed`
 *
 * @returns {-1 | 1 | null | 0} the validation status calculated from given counts of each review status on one detection.
 */
function calculateReviewStatus (n, u, p) {
  if (n > u && n > p) {
    return -1
  } else if (p > u && p > n) {
    return 1
  } else if (n === 0 && u === 0 && p === 0) {
    return null
  } else {
    return 0
  }
}

module.exports = {
  createOrUpdate,
  calculateReviewStatus
}
