const { Classifier, Classification, ClassifierOutput, Sequelize } = require('../../_models')
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

module.exports = {
  query
}
