console.log('----------------------------------\nRFCX | main started')

// Ensure unhandled promises are handled by the process
require('../utils/process')

// check that all required env vars are set
require('../common/config/inspector')

const messageQueue = require('../common/message-queue/sqs')
if (!messageQueue.isEnabled()) {
  throw new Error('Message queue not enabled')
}

const tasks = require('./listen')

console.log('RFCX | Starting task server')
tasks.listen(messageQueue)
