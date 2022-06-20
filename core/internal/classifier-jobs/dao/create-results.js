const { EmptyResultError } = require('../../../../common/error-handling/errors')
const { ClassifierJob, sequelize } = require('../../../_models')
const { create } = require('../../../detections/dao/create')

async function createResults (jobId, { analyzedMinutes, detections }) {
  // Check job exists
  const job = await ClassifierJob.findByPk(jobId, { raw: true })
  if (!job) {
    throw new EmptyResultError()
  }

  // Save detections
  await create(detections)

  // Update job minutes completed
  await sequelize.query(
    `
    UPDATE classifier_jobs
    SET minutes_completed = minutes_completed + $analyzedMinutes
    WHERE id = $jobId
    `,
    { bind: { jobId, analyzedMinutes } }
  )
}

module.exports = {
  createResults
}
