const EmptyResultError = require('../../utils/converter/empty-result-error')
const models = require('../../modelsTimescale')
const moment = require('moment')

/**
 * Gets classifier deployment from
 * @param {integer} id
 * @throws EmptyResultError when classifier not found
 */
async function get (id) {
  const deployment = await models.ClassifierDeployment.findOne({ where: { id } })
  if (!deployment) {
    throw new EmptyResultError('Classifier deployment information with given id not found.')
  }
  return deployment
}


/**
 * Gets classifier deployments based on input params
 * @param {*} filters
 * @param {string} filters.platform
 * @param {boolean} filters.deployed
 * @param {string} filter.start
 * @param {string} filters.end
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

  if (filters.start) {
    condition.start = { [models.Sequelize.Op.gte]: moment.utc(filters.startAfter).valueOf() }
  }

  if (filters.end) {
    condition.end = { [models.Sequelize.Op.lte]: moment.utc(filters.endBefore).valueOf() }
  }

  const query = {
    where: condition,
    attributes: ['id', 'deployed', 'status', 'start', 'end', 'platform', 'deployment_parameters'],
    include: {
      model: models.Classifier,
      as: 'classifier',
      attributes: ['id', 'name']
    }
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
