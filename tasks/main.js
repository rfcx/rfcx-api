console.info('info: Tasks: Starting...')

// Ensure unhandled promises are handled by the process
require('../common/error-handling/process')

// check that all required env vars are set
require('../common/config')

const messageQueue = require('../common/message-queue/sqs')
if (!messageQueue.isEnabled()) {
  throw new Error('Message queue not enabled')
}

const tasks = require('./listen')

console.info('info: Tasks: Listening...')
tasks.listen(messageQueue)
