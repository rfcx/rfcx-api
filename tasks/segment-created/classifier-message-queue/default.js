/**
 * Get the default MessageQueue from the environment configuration
 * @module defaultClassifierMessageQueue
 * @type {ClassifierMessageQueue}
 */

const ClassifierMessageQueue = require('.')
const messageQueue = new ClassifierMessageQueue('sqs', { queuePrefix: 'classifier' })

module.exports = messageQueue
