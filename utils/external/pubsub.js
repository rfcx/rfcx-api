const {PubSub} = require('@google-cloud/pubsub')

const pubsub = new PubSub({
  projectId: 'your-project-id',
  keyFilename: '/path/to/keyfile.json'
})

async function publish(topicName, message) {
  const data = typeof message === 'string' ? message : JSON.stringify(message)
  const dataBuffer = Buffer.from(data)

  const messageId = await pubSubClient.topic(topicName).publish(dataBuffer)
  console.debug(`Message ${messageId} published.`)
}

module.exports = { publish }