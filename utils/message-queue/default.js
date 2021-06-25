const isEnabled = process.env.MESSAGE_QUEUE_ENABLED === 'true'

/**
 * Get the default MessageQueue from the environment configuration
 * @module defaultMessageQueue
 * @type {MessageQueue}
 */
let messageQueue

if (isEnabled) {
  const MessageQueue = require('.')
  const SQSClient = require('./sqs-client')
  const sqs = new SQSClient({ endpoint: process.env.MESSAGE_QUEUE_ENDPOINT })
  const options = { queuePrefix: process.env.MESSAGE_QUEUE_PREFIX }
  messageQueue = new MessageQueue(sqs, options)
  messageQueue.isEnabled = () => true
} else {
  messageQueue = { isEnabled: () => false }
}

module.exports = messageQueue
