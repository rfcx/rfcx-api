/** Generic message queue */
class MessageQueue {
  /**
   * Create a message queue, injecting a client (e.g. SQS)
   * @param {unknown} client
   * @param {*} options
   * @param {string} options.queuePrefix Defaults to "testing-core"
   */
  constructor (client, options = {}) {
    this.client = client
    this.queuePrefix = options.queuePrefix || 'testing-core'
  }

  queueName (eventName) {
    return `${this.queuePrefix}-${eventName}`
  }

  /**
   *
   * @param {string} eventName
   * @param {*} message
   */
  async enqueue (eventName, message) {
    const queue = this.queueName(eventName)
    try {
      await this.client.publish(queue, message)
    } catch (err) {
      console.error(`Message Queue: Failed to enqueue: ${err.message}`)
    }
  }

  static isEnabled () { return process.env.MESSAGE_QUEUE_ENABLED === 'true' }

  static default () {
    if (!MessageQueue.instance) {
      const SQSClient = require('./sqs-client')
      const sqs = new SQSClient({ endpoint: process.env.MESSAGE_QUEUE_ENDPOINT })
      const options = { queuePrefix: process.env.MESSAGE_QUEUE_PREFIX }
      MessageQueue.instance = new MessageQueue(sqs, options)
    }
    return MessageQueue.instance
  }
}

module.exports = MessageQueue
