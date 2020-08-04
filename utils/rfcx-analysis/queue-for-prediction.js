const legacyQueueToNeo4jAndSqs = require('../rfcx-checkin/checkin-audio').audio.queueForTaggingByActiveV3Models

function queueForPrediction(audioInfo, guardian) {
  if (process.env.NEO4J_ENABLED === 'true') {
    return legacyQueueToNeo4jAndSqs(audioInfo, guardian)
  }
  return Promise.resolve()
}

module.exports = queueForPrediction