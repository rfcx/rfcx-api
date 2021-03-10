const EmptyResultError = require('../../utils/converter/empty-result-error')
const models = require('../../modelsTimescale')
const moment = require('moment')

/**
 * Gets classifier deployment from
 * @param {integer} id
 */
async function get (id) {
  try {
    return await models.ClassifierDeployment.findOne({ where: { id } })
  } catch (e) {
    throw new EmptyResultError('Classifier deployment information with given id not found.')
  }
}


/**
 * Gets classifier deployments based on input params
 * @param {*} filters
 * @param {string} filters.platform
 * @param {boolean} filters.deployed
 * @param {string} filters.endBefore
 * @param {string} filter.startAfter
 * @param {string} filter.type
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

  const query = {
    where: condition,
    attributes: models.ClassifierDeployment.attributes.full
  }

  if (filters.type && filters.type === 'only_last') {
    query.order = [['id', 'DESC']]
  }

  const deployments = await models.ClassifierDeployment.findAll(query)

  if (filters.type) {
    const filteredDeployments = []
    for (const deployment of deployments) {
      const idx = filteredDeployments.findIndex(d => d.classifier_id === deployment.classifier_id)
      if (idx < 0) {
        filteredDeployments.push(deployment)
      }
    }
    return filteredDeployments
  }

  return deployments
}

/**
 * Update classifier deployment deployed status by id
 * @param {number} id
 * @param {boolean} deployed
 */
async function update(id, deployed) {
  const deployment = await get(id)
  await deployment.update({ deployed: deployed })
}

module.exports = {
  get,
  query,
  update
}
