const { EmptyResultError } = require('../../../../common/error-handling/errors')
const { ClassifierJob } = require('../../../_models')
const { create } = require('../../../detections/dao/create')

async function createResults (jobId, { analyzedMinutes, detections }) {
  const job = await ClassifierJob.findByPk(jobId, { raw: true })
  if (!job) {
    throw new EmptyResultError('Classifier job not found')
  }

  await create(detections)
}

module.exports = {
  createResults
}
