const enqueueClassifiers = require('./enqueue-classifiers')

/**
 * Callback from subscribing to a message queue, one call per message
 * @async
 * @param {*} payload
 * @param {string} payload.id Segment that was created
 * @param {string} payload.start Start timestamp of the created segment
 * @param {string} payload.streamId Stream of the created segment
 * @return {boolean} true if the task succeeded
 */
async function performTask (payload) {
  const { start, streamId } = payload

  await enqueueClassifiers(streamId, start)

  return true
}

module.exports = performTask
