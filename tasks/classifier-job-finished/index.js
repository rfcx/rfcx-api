const { updateSummary } = require('../../core/classifier-jobs/bl/summary')

/**
 * Callback from subscribing to a message queue, one call per message
 * @async
 * @param {*} payload
 * @param {string} payload.jobId Classifier job id
 * @return {boolean} true if the task succeeded
 */
async function performTask (payload) {
  const { jobId } = payload

  await updateSummary(jobId)

  return true
}

module.exports = performTask
