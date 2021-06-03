console.log('----------------------------------\nRFCX | main started')

// Ensure unhandled promises are handled by the process
require('../utils/process')

// check that all required env vars are set
require('../config/inspector')

const MessageQueue = require('../utils/message-queue')
if (!MessageQueue.isEnabled()) {
  throw new Error('Message queue not enabled')
}

const tasks = require('../tasks')
const messageQueue = MessageQueue.default()

console.log('RFCX | Starting task server')
tasks.listen(messageQueue)
