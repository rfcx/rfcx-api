const isEnabled = process.env.MESSAGE_QUEUE_ENABLED === 'true'

/**
 * Get the SNS MessageQueue from the environment configuration
 * @module snsMessageQueue
 * @type {MessageQueue}
 */
let messageQueue

if (isEnabled) {
  const { MessageQueue } = require('@rfcx/message-queue')
  const messageQueue = new MessageQueue('sns', {
    endpoint: process.env.MESSAGE_QUEUE_ENDPOINT,
    topicPostfix: process.env.NODE_ENV
  })
  messageQueue.isEnabled = () => true
} else {
  messageQueue = { isEnabled: () => false }
}

module.exports = messageQueue
