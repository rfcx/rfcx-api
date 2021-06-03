/**
 * Generic message queue
 * @class
 * */
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
   * Append a message to the queue
   *
   * @param {string} eventName
   * @param {*} message
   */
  async publish (eventName, message) {
    const queue = this.queueName(eventName)
    try {
      await this.client.publish(queue, message)
    } catch (err) {
      console.error(`Message Queue: Failed to enqueue: ${err.message}`)
    }
  }

  /**
   * Pull a message out of the queue
   *
   * @param {string} eventName
   * @param {number} maxMessages Number of messages to dequeue
   */
  async consume (eventName, maxMessages) {
    const queue = this.queueName(eventName)
    return await this.client.consume(queue, maxMessages).catch(err => {
      console.error(`Message Queue: Failed to dequeue: ${err.message}`)
      return []
    })
  }

  /**
   * Callback from subscribing to a message queue, one call per message
   * @async
   * @callback MessageHandler
   * @param {*} message
   * @return {boolean} true if the message was handled successfully (and can be deleted from the queue)
   */

  /**
   * Subscribe to receive messages from the queue
   * @param {string} eventName
   * @param {MessageHandler} messageHandler
   */
  subscribe (eventName, messageHandler) {
    const queue = this.queueName(eventName)
    this.client.subscribe(queue, messageHandler)
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
