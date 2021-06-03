const SQS = require('aws-sdk/clients/sqs')
const { Consumer } = require('sqs-consumer')

class SQSMessageQueueClient {
  /**
   * Create an SQS client
   * @param {unknown} client
   * @param {*} options Additional configuration to pass to AWS SQS client
   */
  constructor (options = {}) {
    this.sqs = new SQS({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION_ID,
      ...options
    })
    this.cachedQueueUrls = {}
  }

  async queueUrl (queueName) {
    if (!this.cachedQueueUrls[queueName]) {
      const result = await this.sqs.getQueueUrl({ QueueName: queueName }).promise()
      this.cachedQueueUrls[queueName] = result.QueueUrl
    }

    return this.cachedQueueUrls[queueName]
  }

  async publish (queueName, message) {
    const payload = {
      MessageBody: JSON.stringify(message),
      QueueUrl: await this.queueUrl(queueName)
    }
    return this.sqs.sendMessage(payload).promise()
  }

  subscribe (queueName, messageHandler) {
    const consumer = Consumer.create({
      queueUrl: this.queueUrl(queueName),
      batchSize: 10,
      pollingWaitTimeMs: 1000,
      handleMessage: async (message) => {
        const body = JSON.parse(message.Body)
        try {
          await messageHandler(body)
        } catch (e) {
          console.error(e)
          return false
        }
        return true
      },
      sqs: this.sqs
    })

    consumer.on(['error', 'processing_error', 'timeout_error'], (err) => {
      console.error('Message Queue SQS consumer', err.message)
    })

    consumer.start()
  }
}

module.exports = SQSMessageQueueClient
