const { get } = require('./index')
const { DetectionReview, sequelize } = require('../../modelsTimescale')

async function review (filters, options) {
  // check if detection exists
  const detection = await get(filters, { ...options, fields: ['id'] })
  return sequelize.transaction(async (transaction) => {
    const reviewBase = {
      user_id: filters.userId,
      detection_id: detection.id
    }
    // delete previous user review (if exists)
    await DetectionReview.destroy({ where: reviewBase }, { transaction })
    // create new user review
    await DetectionReview.create({ ...reviewBase, positive: filters.positive }, { transaction })
    // get all reviews for detection to calculate new review_status
    const reviews = await DetectionReview.findAll({ where: { detection_id: detection.id } }, { transaction })
    const counts = {
      confirmed: 0,
      rejected: 0
    }
    reviews.forEach((r) => {
      counts[r.positive ? 'confirmed' : 'rejected']++
    })
    // refresh detection review_status
    detection.review_status = counts.confirmed > counts.rejected ? 1 : -1
    await detection.save({ fields: ['review_status'], transaction })
  })
}

module.exports = {
  review
}
