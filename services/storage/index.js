const service = process.env.PLATFORM === 'google' ? require('./google') : require('./amazon')
const buckets = {
  streams: process.env.INGEST_BUCKET || 'rfcx-streams-testing',
  streamsCache: process.env.STREAMS_CACHE_BUCKET || "rfcx-streams-cache-testing"
}
module.exports = { ...service, buckets }
