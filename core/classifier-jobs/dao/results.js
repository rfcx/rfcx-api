const { Classification, ClassifierJobSummary } = require('../../_models')

const availableIncludes = [
  Classification.include({ attributes: ['value', 'title', 'image'] })
]

async function createJobSummary (classificationData, options = {}) {
  const transaction = options.transaction
  return await ClassifierJobSummary.bulkCreate(classificationData, { transaction })
}

async function getJobSummaries (classifierJobId, filters, options = {}) {
  const transaction = options.transaction
  if (!classifierJobId) {
    throw new Error('Classifier job id must be set to get job summary')
  }
  const where = { classifierJobId }
  if (filters.classificationId) {
    where.classificationId = filters.classificationId
  }
  return await ClassifierJobSummary.findAll({
    where,
    attributes: ClassifierJobSummary.attributes.lite,
    include: availableIncludes,
    transaction
  })
}

async function updateJobSummary (classifierJobId, classificationId, data, options = {}) {
  const transaction = options.transaction
  const where = { classifierJobId, classificationId }
  const update = {};
  ['total', 'confirmed', 'rejected', 'uncertain'].forEach(s => {
    if (data[s] !== undefined) {
      update[s] = data[s]
    }
  })
  return await ClassifierJobSummary.update(data, {
    where,
    transaction
  })
}

async function deleteJobSummary (classifierJobId, options = {}) {
  if (!classifierJobId) {
    throw new Error('Classifier job id must be set for job summary delete')
  }
  const transaction = options.transaction
  const where = { classifierJobId }
  return await ClassifierJobSummary.destroy({ where }, { transaction })
}

module.exports = {
  createJobSummary,
  getJobSummaries,
  updateJobSummary,
  deleteJobSummary
}
