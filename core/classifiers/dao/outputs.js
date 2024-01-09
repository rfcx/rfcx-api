const { Classifier, Classification, ClassifierOutput, Sequelize } = require('../../_models')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const pagedQuery = require('../../_utils/db/paged-query')

const availableIncludes = [
  Classifier.include(),
  Classification.include({ attributes: ['id', 'value', 'title', 'image'] })
]

async function query (filters, options = {}) {
  const transaction = options.transaction
  const { classifiers } = filters
  const where = {}
  if (classifiers) {
    where.classifier_id = { [Sequelize.Op.or]: classifiers }
  }

  const attributes = options.fields && options.fields.length > 0 ? ClassifierOutput.attributes.full.filter(a => options.fields.includes(a)) : ClassifierOutput.attributes.lite
  const include = options.fields && options.fields.length > 0 ? availableIncludes.filter(i => options.fields.includes(i.as)) : []

  return pagedQuery(ClassifierOutput, {
    where,
    attributes,
    include,
    limit: options.limit,
    offset: options.offset,
    transaction
  })
}

/**
 * Update a classifier outout
 * @param {number} classifierId
 * @param {*} classifierOutput
 * @param {float} classifierOutput.ignore_threshold
 * @param {*} options Additional update options
 * @param {object} options.transaction Sequelize transaction object
 */
async function update (classifierId, classifierOutput, options = {}) {
  const transaction = options.transaction
  const classifierOutputs = await ClassifierOutput.findAll({
    where: { classifier_id: classifierId },
    transaction
  })
  if (classifierOutputs.length === 0) {
    throw new EmptyResultError('Classifier outputs with given Classifier id not found.')
  }
  return await Promise.all(classifierOutputs.map(output => {
    return output.update(classifierOutput, { transaction })
  }))
}

module.exports = {
  query,
  update
}
