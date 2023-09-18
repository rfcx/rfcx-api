const { EmptyResultError } = require('../../../../common/error-handling/errors')
const { ClassifierJob, sequelize } = require('../../../_models')
const detectionsBl = require('../../../detections/bl')
const segmentsDao = require('../../../classifiers/dao/processed-segments')

async function createResults (jobId, { analyzedMinutes, detections, segments }) {
  return sequelize.transaction(async (transaction) => {
    // Check job exists
    const job = await ClassifierJob.findByPk(jobId, { raw: true, transaction })
    if (!job) {
      throw new EmptyResultError()
    }

    // Save detections
    await detectionsBl.create(detections.map(d => ({ ...d, classifier: job.classifierId, classifierJobId: jobId })), { transaction })

    // Save processed segments
    await segmentsDao.create(segments.map(s => ({ ...s, classifierId: job.classifierId, classifierJobId: jobId })), { transaction })

    // Update job minutes completed
    await sequelize.query(
      `
      UPDATE classifier_jobs
      SET minutes_completed = minutes_completed + $analyzedMinutes
      WHERE id = $jobId
      `,
      { bind: { jobId, analyzedMinutes }, transaction }
    )
  })
}

module.exports = {
  createResults
}
