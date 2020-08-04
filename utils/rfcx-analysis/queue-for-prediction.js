const legacyQueueToNeo4jAndSqs = require('../rfcx-checkin/checkin-audio').audio.queueForTaggingByActiveV3Models
const pubsub = require('../external/pubsub')

function queueForPrediction(audioInfo, guardian) {
  if (process.env.NEO4J_ENABLED === 'true') {
    return legacyQueueToNeo4jAndSqs(audioInfo, guardian)
  }
  if (process.env.PUBSUB_ENABLED === 'true') {
    const streamId = guardian.guid
    const timestamp = audioInfo.
    return getClassifiers(streamId)
      .then(classifiers => Promise.all(
        classifiers.map(c => publish(c, streamId, timestamp))))
  }
  return Promise.resolve()
}

function getClassifiers(streamId) {
  return Promise.resolve(['chainsaw', 'vehicle']) // TODO: should get list of classifiers whitelisted for a stream
}

function publish(classifier, streamId, timestamp) {
  const topic = `prediction-${classifier}`
  const message = {
    stream_id: streamId,
    start: timestamp
  }
  return pubsub.publish(topic, message)
}

module.exports = queueForPrediction