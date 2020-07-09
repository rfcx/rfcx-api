const models = require('../../modelsTimescale')

/**
 * Creates detection review item with selected params; Removes all previously created reviews for specified detection and user
 * @param {*} detection_id
 * @param {*} user_id
 * @param {*} positive
 */
async function create(detection_id, user_id, positive) {
  return models.sequelize.transaction(async (transaction) => {
    await models.DetectionReview.destroy({ where: { detection_id, user_id }, transaction })
    const detectionReview = await models.DetectionReview.create({ detection_id, user_id, positive }, transaction)
    return detectionReview
  })
}

module.exports = {
  create
}
