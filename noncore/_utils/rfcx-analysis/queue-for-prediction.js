const legacyQueueToNeo4jAndSqs = require('../rfcx-checkin/checkin-audio').audio.queueForTaggingByActiveV3Models
const aws = require('../../_utils/external/aws').aws()

function queueForPrediction (audioInfo, guardian) {
  console.info(`queueForPrediction: guardian ${guardian.guid} stream ${guardian.stream_id}`)
  if (!guardian.stream_id) {
    return Promise.resolve()
  }
  if (process.env.NEO4J_ENABLED === 'true') {
    return legacyQueueToNeo4jAndSqs(audioInfo, guardian)
  }
  const streamId = guardian.stream_id
  const timestamp = audioInfo.dbAudioObj.measured_at
  return getClassifiers(streamId)
    .then(classifiers => Promise.all(
      classifiers.map(c => publish(c, streamId, timestamp))))
}

function getClassifiers (streamId) {
  console.warn('NOT IMPLEMENTED: using chainsaw and vehicle only')
  return Promise.resolve([ // TODO: should get list of active classifiers a stream
    { platform: 'aws', name: 'chainsaw', version: 5 }
  ])
}

function publish (classifier, streamId, timestamp) {
  let topic = `classifier-${classifier.platform}-${classifier.name}-v${classifier.version}`
  if (process.env.NODE_ENV !== 'production') {
    topic += `-${process.env.NODE_ENV}`
  }
  const message = {
    stream_id: streamId,
    start: timestamp
  }
  return aws.publish(topic, message)
}

module.exports = queueForPrediction
