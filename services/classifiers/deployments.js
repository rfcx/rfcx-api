const { EmptyResultError } = require('../../utils/errors')
const { Classifier, ClassifierDeployment, Sequelize } = require('../../modelsTimescale')
const pagedQuery = require('../../utils/db/paged-query')
const { getSortFields } = require('../../utils/sequelize/sort')
const models = require('../../modelsTimescale')

const availableIncludes = [
  Classifier.include()
]

/**
 * Gets classifier deployment from
 * @param {integer} id
 * @throws EmptyResultError when classifier not found
 */
async function get (id) {
  const deployment = await ClassifierDeployment.findOne({ where: { id }, include: [{ model: models.Classifier, as: 'classifier', attributes: ['modelUrl'] }], attributes: { exclude: ['classifier_id', 'created_by_id'] } }).then(deployment => {
    const { classifier, ...deploymentObj } = deployment.toJSON()
    deploymentObj.modelUrl = classifier.modelUrl
    return deploymentObj
  })
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
 * @param {Date|Moment} filter.start
 * @param {Date|Moment} filters.end
 * @param {*} options
 * @param {string[]} options.fields
 * @param {string} options.sort
 * @param {number} options.limit
 * @param {number} options.offset
 */
async function query (filters, options = {}) {
  const where = {}

  if (filters.platform) {
    where.platform = filters.platform
  }

  if (filters.deployed !== undefined) {
    where.deployed = filters.deployed
  }

  if (filters.start) {
    where.start = { [Sequelize.Op.gte]: filters.start }
  }

  if (filters.end) {
    where.end = { [Sequelize.Op.lte]: filters.end }
  }

  const attributes = options.fields && options.fields.length > 0 ? ClassifierDeployment.attributes.full.filter(a => options.fields.includes(a)) : ClassifierDeployment.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []
  const order = getSortFields(options.sort || '-start')

  return pagedQuery(ClassifierDeployment, {
    where,
    attributes,
    include,
    order,
    limit: options.limit,
    offset: options.offset
  })
}

/**
 * Update classifier deployment
 * @param {number} id
 * @param {ClassifierDeployment} deployment
 */
async function update (id, deployed) {
  const deployment = await get(id)
  await deployment.update({ deployed: deployed })
}

module.exports = {
  get,
  query,
  update
}
