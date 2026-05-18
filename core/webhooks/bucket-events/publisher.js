/**
 * RabbitMQ publisher for bucket-event webhooks.
 *
 * Uses amqplib directly rather than @rfcx/message-queue because that
 * library calls assertQueue() with empty arguments, which conflicts
 * with the pre-declared quorum queue topology (x-queue-type=quorum +
 * x-dead-letter-exchange) created via platform/rabbitmq/definitions.json.
 *
 * Connection state is lazy + recoverable: first publish opens a channel,
 * subsequent publishes reuse it, and connection/channel errors drop the
 * cached state so the next publish reconnects.
 */

const amqplib = require('amqplib')

const URL = process.env.RABBITMQ_URL || process.env.AMQP_URL

let _connection = null
let _channel = null
let _lock = Promise.resolve()

async function _getChannel () {
  if (_channel) {
    return _channel
  }
  // Serialize connect attempts so concurrent first-callers don't open
  // multiple connections.
  _lock = _lock.then(async () => {
    if (_channel) {
      return _channel
    }
    if (!URL) {
      throw new Error('RABBITMQ_URL (or AMQP_URL) env var must be set to publish events')
    }
    if (!_connection) {
      _connection = await amqplib.connect(URL)
      _connection.on('error', (err) => {
        console.error('bucket-events publisher: rabbitmq connection error', err && err.message)
      })
      _connection.on('close', () => {
        _connection = null
        _channel = null
      })
    }
    _channel = await _connection.createConfirmChannel()
    _channel.on('error', (err) => {
      console.error('bucket-events publisher: rabbitmq channel error', err && err.message)
    })
    _channel.on('close', () => { _channel = null })
    return _channel
  })
  return _lock
}

/**
 * Publish an ObjectCreated:Put event to a downstream consumer queue.
 *
 * Message body matches the existing AWS S3 event-notification shape
 * that ingest-service-tasks already parses (Records[].s3.bucket/.object).
 * The default exchange + routing-key=queueName routes directly to the
 * queue without needing to declare an intermediate exchange.
 */
async function publishObjectCreated ({ queueName, bucket, key, size }) {
  const channel = await _getChannel()
  const body = JSON.stringify({
    Records: [{
      eventName: 'ObjectCreated:Put',
      eventSource: 'rfcx-local:webhooks-bucket-events',
      s3: {
        bucket: {
          name: bucket,
          arn: `arn:aws:s3:::${bucket}`
        },
        object: {
          key,
          size: typeof size === 'number' ? size : 0
        }
      }
    }]
  })
  // ConfirmChannel: callback resolves when the broker confirms persistent
  // delivery to the queue, giving the caller real delivery semantics.
  await new Promise((resolve, reject) => {
    const ok = channel.sendToQueue(
      queueName,
      Buffer.from(body),
      { persistent: true, contentType: 'application/json' },
      (err) => { err ? reject(err) : resolve() }
    )
    if (!ok) {
      channel.once('drain', () => {})
    }
  })
}

module.exports = { publishObjectCreated }
