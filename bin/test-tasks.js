require('../config/inspector')

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

function question (prompt) {
  return new Promise((resolve) => {
    readline.question(prompt, (input) => resolve(input))
  })
}

// Setup queue
const MessageQueue = require('../utils/message-queue')
const { SEGMENT_CREATED } = require('../utils/message-queue/events')
if (!MessageQueue.isEnabled()) {
  throw new Error('Message queue not enabled')
}
const messageQueue = MessageQueue.default()

async function main () {
  // Print a menu of tasks
  const tasks = [SEGMENT_CREATED]
  console.log('\nAvailable tasks\n---------------\n')
  tasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task}`)
  })
  console.log()
  // User selects task
  const taskIndex = await question('Enter task number: ') - 1
  if (tasks[taskIndex] === SEGMENT_CREATED) {
    // Get additional input for task
    const id = await question('Enter segment id [xyz]: ') || 'xyz'
    const streamId = await question('Enter stream id [ev69cht895gc]: ') || 'ev69cht895gc'
    const start = await question('Enter start timestamp [2021-06-01T00:10:20Z]: ') || '2021-06-01T00:10:20Z'
    // Queue task
    await messageQueue.publish(SEGMENT_CREATED, { id, streamId, start })
  } else {
    console.error('Invalid input')
  }
}

main().then(() => {
  console.log('\nDone!')
  process.exit(0)
})
