/**
 * Get the default MessageQueue from the environment configuration
 * @module defaultClassifierMessageQueue
 * @type {ClassifierMessageQueue}
 */

const ClassifierMessageQueue = require('.')
const SQSClient = require('../../../utils/message-queue/sqs-client')

const sqs = new SQSClient({ endpoint: process.env.MESSAGE_QUEUE_ENDPOINT })
const options = { queuePrefix: 'classifier' }
const messageQueue = new ClassifierMessageQueue(sqs, options)

module.exports = messageQueue
