const isEnabled = process.env.MESSAGE_QUEUE_ENABLED === 'true'

/**
 * Get the default MessageQueue from the environment configuration.
 *
 * The module is still named `sqs` for backwards-compatibility (it's the
 * publisher for `segmentCreated`, `classifierJobFinished` etc. that
 * core-tasks listens to). The backend is now selectable via the env var
 * MESSAGE_QUEUE_KIND:
 *
 *   MESSAGE_QUEUE_KIND=sqs       (default) — AWS SQS, production behavior
 *   MESSAGE_QUEUE_KIND=rabbitmq  — AMQP broker via RABBITMQ_URL
 *
 * When MESSAGE_QUEUE_ENABLED!=true, returns a no-op stub (unchanged
 * upstream behavior — must opt into the queue explicitly).
 *
 * @module sqsMessageQueue
 * @type {MessageQueue}
 */
let messageQueue

if (isEnabled) {
  const { MessageQueue } = require('@rfcx/message-queue')
  const kind = process.env.MESSAGE_QUEUE_KIND || 'sqs'
  messageQueue = new MessageQueue(kind, {
    endpoint: process.env.MESSAGE_QUEUE_ENDPOINT,
    topicPrefix: process.env.MESSAGE_QUEUE_PREFIX
  })
  messageQueue.isEnabled = () => true
} else {
  messageQueue = { isEnabled: () => false }
}

module.exports = messageQueue
