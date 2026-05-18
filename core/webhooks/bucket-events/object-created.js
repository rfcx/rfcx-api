/**
 * POST /webhooks/bucket-events/object-created
 *
 * Notify the platform that an object was created in one of our managed
 * buckets. Translates the call into an S3-event-shaped message on a
 * RabbitMQ trigger queue (e.g. ingest-service-upload-production).
 *
 * Caller is either:
 *   - Cloudflare R2 event notifications (HMAC-authenticated), or
 *   - Internal services / cron / backfill (systemUser bearer JWT).
 *
 * Body:
 *   {
 *     "bucket": "rfcx-ingest-r2",                  // required
 *     "key":    "<streamId>/<uploadId>.opus",      // required
 *     "size":   168536                             // optional, bytes
 *   }
 *
 * The bucket -> queue mapping is configured via env
 * EVENT_QUEUE_BY_BUCKET, a JSON object e.g.:
 *   { "rfcx-ingest-r2": "ingest-service-upload-production" }
 * Buckets not in the map -> 400 Bad Request (defensive default).
 *
 * Idempotency: republishing the same key just re-triggers ingest,
 * which dedupes by checksum in the existing ingest pipeline
 * (ingest-service IngestionError DUPLICATE -> status=31).
 */

const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const { ValidationError } = require('../../../common/error-handling/errors')
const { publishObjectCreated } = require('./publisher')

let _bucketQueueMap = null
function getBucketQueueMap () {
  if (_bucketQueueMap !== null) {
    return _bucketQueueMap
  }
  const raw = process.env.EVENT_QUEUE_BY_BUCKET
  if (!raw) {
    _bucketQueueMap = {}
    return _bucketQueueMap
  }
  try {
    _bucketQueueMap = JSON.parse(raw)
  } catch (e) {
    console.error('EVENT_QUEUE_BY_BUCKET is set but is not valid JSON:', e.message)
    _bucketQueueMap = {}
  }
  return _bucketQueueMap
}

module.exports = async function (req, res) {
  const converter = new Converter(req.body, {})
  converter.convert('bucket').toString()
  converter.convert('key').toString()
  converter.convert('size').optional().toInt().default(0)

  try {
    const params = await converter.validate()
    const map = getBucketQueueMap()
    const queueName = map[params.bucket]
    if (!queueName) {
      throw new ValidationError(`bucket ${params.bucket} is not configured as an event source (EVENT_QUEUE_BY_BUCKET)`)
    }
    await publishObjectCreated({
      queueName,
      bucket: params.bucket,
      key: params.key,
      size: params.size
    })
    console.info(`webhooks/bucket-events/object-created: published bucket=${params.bucket} key=${params.key} queue=${queueName} auth=${req.webhookAuthMethod || 'unknown'}`)
    return res.status(204).end()
  } catch (e) {
    return httpErrorHandler(req, res, 'Failed to publish object-created event')(e)
  }
}
