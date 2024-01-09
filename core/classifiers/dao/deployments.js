const { EmptyResultError } = require('../../../common/error-handling/errors')
const { Classifier, ClassifierDeployment, Sequelize } = require('../../_models')
const pagedQuery = require('../../_utils/db/paged-query')
const { getSortFields } = require('../../_utils/db/sort')
const { toCamelObject } = require('../../_utils/formatters/string-cases')

const availableIncludes = [
  Classifier.include({ attributes: Classifier.attributes.full })
]

/**
 * Gets classifier deployment from
 * @param {integer} id
 * @param {string[]} options.fields
 * @throws EmptyResultError when classifier not found
 */
async function get (id, options = {}) {
  const where = { id }

  const classifierAttributes = options.fields && options.fields.length > 0 ? ClassifierDeployment.attributes.full.filter(a => options.fields.includes(a)) : ClassifierDeployment.attributes.full
  const attributes = { ...classifierAttributes, exclude: ['classifier_id', 'classifierId', 'created_by_id'] }
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  const deployment = await ClassifierDeployment.findOne({ where, attributes, include, raw: true, nest: true })

  if (!deployment) {
    throw new EmptyResultError('Classifier deployment information with given id not found.')
  }

  deployment.classifier = toCamelObject(deployment.classifier, 1)

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
 * @param {*} options Additional update options
 * @param {object} options.transaction Sequelize transaction object
 */
async function update (id, deployment, options = {}) {
  const transaction = options.transaction
  await ClassifierDeployment.update(deployment, { where: { id }, transaction })
}

module.exports = {
  get,
  query,
  update
}
