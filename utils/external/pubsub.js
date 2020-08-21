const {PubSub} = require('@google-cloud/pubsub')

const client = new PubSub()

const ERROR_TOPIC_ALREADY_EXISTS = 6

async function publish(topicName, message) {
  const data = typeof message === 'string' ? message : JSON.stringify(message)
  const dataBuffer = Buffer.from(data)

  try {
    await client.createTopic(topicName)
  } catch (error) {
    if (error.code !== ERROR_TOPIC_ALREADY_EXISTS) {
      console.log(error)
    }
  }

  const messageId = await client.topic(topicName).publish(dataBuffer)
  console.debug(`Message ${messageId} published.`)
}

module.exports = { publish }