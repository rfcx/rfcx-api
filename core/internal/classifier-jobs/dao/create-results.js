const { EmptyResultError } = require('../../../../common/error-handling/errors')
const { ClassifierJob } = require('../../../_models')

async function createResults (jobId, { analyzedMinutes, detections }) {
  const job = await ClassifierJob.findByPk(jobId, { raw: true })
  if (!job) {
    throw new EmptyResultError('Classifier job not found')
  }
}

module.exports = {
  createResults
}
