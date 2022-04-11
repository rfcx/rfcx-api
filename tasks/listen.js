const { SEGMENT_CREATED } = require('../common/message-queue/event-names')
const segmentCreated = require('./segment-created')

/**
 * Listen for new messages on the queue and process
 * @param {MessageQueue} messageQueue
 */
function listen (messageQueue) {
  const tasks = {
    [SEGMENT_CREATED]: segmentCreated
  }

  for (const [eventName, eventTask] of Object.entries(tasks)) {
    messageQueue.subscribe(eventName, eventTask)
  }
}

module.exports = { listen }
