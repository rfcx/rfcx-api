const { SEGMENT_CREATED, CLASSIFIER_JOB_FINISHED } = require('../common/message-queue/event-names')
const segmentCreated = require('./segment-created')
const classifierJobFinished = require('./classifier-job-finished')

/**
 * Listen for new messages on the queue and process
 * @param {MessageQueue} messageQueue
 */
function listen (messageQueue) {
  const tasks = {
    [SEGMENT_CREATED]: segmentCreated,
    [CLASSIFIER_JOB_FINISHED]: classifierJobFinished
  }

  for (const [eventName, eventTask] of Object.entries(tasks)) {
    messageQueue.subscribe(eventName, eventTask)
  }
}

module.exports = { listen }
