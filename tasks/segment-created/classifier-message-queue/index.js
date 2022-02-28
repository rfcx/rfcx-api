const { MessageQueue } = require('@rfcx/message-queue')

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
    const prioritySuffix = '' // priority ? '-priority' : ''
    const environmentPrefix = process.env.NODE_ENV === 'production' ? 'classifier-' : `${process.env.NODE_ENV}-classifier-`
    return `${environmentPrefix}${platformPrefix}${classifierIdentifier}${prioritySuffix}`
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
    console.info(`publish: ${queue} ${JSON.stringify(message)}`)
    return super.publish(queue, message)
  }
}

module.exports = ClassifierMessageQueue
