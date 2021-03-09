const models = require('../../modelsTimescale')
const moment = require('moment')

/**
 * Gets classifier deployments based on input params
 * @param {*} filters
 * @param {string} filters.platform
 * @param {boolean} filters.deployed
 * @param {string} filters.endBefore
 * @param {string} filter.startAfter
 */
async function query(filters) {
  const condition = {}

  if (filters.platform) {
    condition.platform = filters.platform
  }

  if (filters.deployed !== undefined) {
    condition.deployed = filters.deployed
  }

  if (filters.startAfter) {
    condition.start = { [models.Sequelize.Op.gte]: moment.utc(filters.startAfter).valueOf() }
  }

  if (filters.endBefore) {
    condition.end = { [models.Sequelize.Op.lte]: moment.utc(filters.endBefore).valueOf() }
  }

  return models.ClassifierDeployment.findAll({
    where: condition,
    order: [['id', 'DESC']],
    attributes: models.ClassifierDeployment.attributes.full
  })
}

/**
 * Update classifier deployment deployed status by id
 * @param {number} id
 * @param {boolean} deployed
 */
async function update(id, deployed) {
  const deployment = await models.ClassifierDeployment.findOne({ where: { id } })
  await models.sequelize.transaction(async (t) => {
    await deployment.update({ deployed: deployed }, { transaction: t })
  })
}

module.exports = {
  query,
  update
}