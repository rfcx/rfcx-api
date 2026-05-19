const isEnabled = process.env.MESSAGE_QUEUE_ENABLED === 'true'

/**
 * Get the SNS MessageQueue from the environment configuration.
 *
 * Mirrors sqs.js: backend is selectable via MESSAGE_QUEUE_KIND for the
 * fan-out publisher. Default 'sns' matches production behavior; setting
 * to 'rabbitmq' uses the same in-cluster broker as sqs.js does.
 *
 * @module snsMessageQueue
 * @type {MessageQueue}
 */
let messageQueue

if (isEnabled) {
  const { MessageQueue } = require('@rfcx/message-queue')
  const kind = process.env.MESSAGE_QUEUE_KIND_SNS || (process.env.MESSAGE_QUEUE_KIND === 'rabbitmq' ? 'rabbitmq' : 'sns')
  messageQueue = new MessageQueue(kind, {
    endpoint: process.env.MESSAGE_QUEUE_ENDPOINT,
    topicPrefix: process.env.MESSAGE_QUEUE_PREFIX
  })
  messageQueue.isEnabled = () => true
} else {
  messageQueue = { isEnabled: () => false }
}

module.exports = messageQueue
