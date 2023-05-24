const { sequelize } = require('../../_models')
const { hasPermission, UPDATE, STREAM } = require('../../roles/dao')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const { get } = require('../dao/get')
const { update } = require('../dao/update')
const reviewsDao = require('../dao/review')

async function createOrUpdate (options) {
  let { streamId, start, status, userId } = options

  if (userId && !(await hasPermission(UPDATE, userId, streamId, STREAM))) {
    throw new ForbiddenError('You do not have permission to review detections in this stream.')
  }

  const detection = await get({ streamId, start }, { fields: ['id'] })
  const detectionId = detection.toJSON().id // Detection model does not have id column, so we have to make toJSON to actually obtain the value

  status = reviewsDao.REVIEW_STATUS_MAPPING[status]
  let review = (await reviewsDao.query({ detectionIds: [detectionId], userId }, { fields: ['id'] }))[0]
  const exists = !!review
  return sequelize.transaction(async (transaction) => {
    if (exists) {
      await reviewsDao.update(review.id, { status }, { transaction })
    } else {
      review = await reviewsDao.create({ detectionId, userId, status }, { transaction })
    }
    await refreshDetectionReviewStatus(detectionId, streamId, start, transaction)
    return { review, created: !exists }
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
  } else {
    return 0
  }
}

module.exports = {
  createOrUpdate,
  calculateReviewStatus
}
