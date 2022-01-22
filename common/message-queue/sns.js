const isEnabled = process.env.MESSAGE_QUEUE_ENABLED === 'true'

/**
 * Get the SNS MessageQueue from the environment configuration
 * @module snsMessageQueue
 * @type {MessageQueue}
 */
let messageQueue

if (isEnabled) {
  const { MessageQueue } = require('@rfcx/message-queue')
  messageQueue = new MessageQueue('sns', {
    endpoint: process.env.MESSAGE_QUEUE_ENDPOINT,
    topicPostfix: process.env.MESSAGE_QUEUE_POSTFIX
  })
  messageQueue.isEnabled = () => true
} else {
  messageQueue = { isEnabled: () => false }
}

module.exports = messageQueue