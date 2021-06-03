const MessageQueue = require('../../utils/message-queue')

/**
 * External message queue onto prediction service
 */
class ClassifierMessageQueue extends MessageQueue {
  /**
   * Compose the queue name from classifier properties
   *
   * @param {Classifier} classifier
   * @param {boolean} priority
   * @returns
   */
  queueName (platform, classifier, priority) {
    const platformPrefix = `${classifier.platform}-`
    const classifierIdentifier = `${classifier.name}-v${classifier.version}`
    const prioritySuffix = priority ? '-priority' : ''
    return `${platformPrefix}${classifierIdentifier}${prioritySuffix}`
  }

  /**
   * Append a message to the queue
   *
   * @param {string} platform
   * @param {Classifier} classifier
   * @param {boolean} priority
   * @param {*} message
   */
  async publish (platform, classifier, priority, message) {
    const queue = this.queueName(platform, classifier, priority)
    try {
      await this.client.publish(queue, message)
    } catch (err) {
      console.error(`Message Queue: Failed to enqueue: ${err.message}`)
    }
  }

  static default () {
    if (!ClassifierMessageQueue.instance) {
      const SQSClient = require('./sqs-client')
      const sqs = new SQSClient({ endpoint: process.env.MESSAGE_QUEUE_ENDPOINT })
      const options = { queuePrefix: 'classifier-' }
      ClassifierMessageQueue.instance = new ClassifierMessageQueue(sqs, options)
    }
    return ClassifierMessageQueue.instance
  }
}

module.exports = ClassifierMessageQueue
