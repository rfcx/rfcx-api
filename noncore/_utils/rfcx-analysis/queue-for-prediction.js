const legacyQueueToNeo4jAndSqs = require('../rfcx-checkin/checkin-audio').audio.queueForTaggingByActiveV3Models

function queueForPrediction (audioInfo, guardian) {
  console.info(`queueForPrediction: guardian ${guardian.guid} stream ${guardian.stream_id}`)
  if (!guardian.stream_id) {
    return Promise.resolve()
  }
  if (process.env.NEO4J_ENABLED === 'true') {
    return legacyQueueToNeo4jAndSqs(audioInfo, guardian)
  }
  return Promise.resolve()
}

module.exports = queueForPrediction
