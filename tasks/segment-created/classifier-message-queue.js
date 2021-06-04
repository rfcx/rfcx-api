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
  classifierQueueName (platform, classifier, priority) {
    const platformPrefix = `${platform}-`
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
    const queue = this.classifierQueueName(platform, classifier, priority)
    return super.publish(queue, message)
  }

  static default () {
    if (!ClassifierMessageQueue.cmqInstance) {
      const SQSClient = require('../../utils/message-queue/sqs-client')
      const sqs = new SQSClient({ endpoint: process.env.MESSAGE_QUEUE_ENDPOINT })
      const options = { queuePrefix: 'classifier' }
      ClassifierMessageQueue.cmqInstance = new ClassifierMessageQueue(sqs, options)
    }
    return ClassifierMessageQueue.cmqInstance
  }
}

module.exports = ClassifierMessageQueue
