const { DetectionReview } = require('../../_models')
const { hasPermission, WRITE, STREAM } = require('../../roles/dao')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const detectionsDao = require('../dao/get')

async function create (options) {
  const { streamId, start, isPositive, userId } = options

  if (userId && !(await hasPermission(WRITE, userId, streamId, STREAM))) {
    throw new ForbiddenError()
  }

  const detection = await detectionsDao.get({ streamId, start }, { fields: ['id'] })

  const review = await DetectionReview.create({
    detectionId: detection.id,
    userId,
    positive: isPositive
  })

  // TODO: refresh review_status for detection

  return review
}

// async function refreshDetectionReviewStatus (detectionId) {

// }
module.exports = {
  create
}
