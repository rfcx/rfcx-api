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
function query (filters) {
  const condition = {}

  if (filters.platform) {
    condition.platform = filters.platform
  }

  if (filters.deployed !== undefined) {
    condition.deployed = filters.deployed
  }

  if (filters.start) {
    condition.start = { [models.Sequelize.Op.gte]: moment.utc(filters.start).valueOf() }
  }

  if (filters.end) {
    condition.end = { [models.Sequelize.Op.lte]: moment.utc(filters.end).valueOf() }
  }

  const query = {
    where: condition,
    attributes: ['id', 'deployed', 'status', 'start', 'end', 'platform', 'deployment_parameters'],
    include: {
      model: models.Classifier,
      as: 'classifier',
      attributes: models.Classifier.attributes.full
    }
  }

  return models.ClassifierDeployment.findAll(query)
}

/**
 * Update classifier deployment
 * @param {number} id
 * @param {ClassifierDeployment} deployment
 */
async function update (id, deployment) {
  await models.ClassifierDeployment.update(deployment, {
    where: { id }
  })
}

module.exports = {
  get,
  query,
  update
}
