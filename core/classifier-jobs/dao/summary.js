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

/**
 * Increment specific job summary metric
 * @param {*} filters
 * @param {number} filters.classifierJobId Where belongs to one of the projects (array of project ids)
 * @param {number} filters.classificationId Include only status in filters
 * @param {*} data Query options
 * @param {string} data.field field which is needed to be incremented
 * @param {number} [data.by=1] increment size
 * @param {*} options
 * @param {object} [options.transaction]
 * @returns
 */
async function incrementJobSummaryMetric (filters, data, options = {}) {
  const transaction = options.transaction
  if (!filters.classifierJobId || !filters.classificationId) {
    throw new Error('filters.classifierJobId and filters.classificationId are required to be set for incrementJobSummaryMetric')
  }
  if (!data.field) {
    throw new Error('data.field is required to be set for incrementJobSummaryMetric')
  }
  return await ClassifierJobSummary.increment(data.field, {
    by: data.by || 1,
    where: filters,
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
  incrementJobSummaryMetric,
  deleteJobSummary
}