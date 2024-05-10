const { updateSummary } = require('../../core/classifier-jobs/bl/summary')
const { get: getJob } = require('../../core/classifier-jobs/bl/get')
const { updateBestDetections } = require('../../core/detections/bl/index')

/**
 * Callback from subscribing to a message queue, one call per message
 * @async
 * @param {*} payload
 * @param {string} payload.jobId Classifier job id
 * @return {boolean} true if the task succeeded
 */
async function performTask (payload) {
  const { jobId } = payload
  console.info(`starting classifier-job-finished task for job ${jobId}`)

  const job = await getJob(jobId, { fields: ['id', 'query_start', 'query_end', 'classifier_id', 'streams'] })
  await updateSummary(job)
  console.info(`updateSummary have finished for job ${jobId}`)
  await updateBestDetections(job)
  console.info(`updateBestDetections have finished for job ${jobId}`)

  return true
}

module.exports = performTask
