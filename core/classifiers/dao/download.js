const storageService = require('../../_services/storage')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { get } = require('./index')

/**
 * Download a classifier file
 * @param {string} classifierId
 */
async function getSignedUrl (classifierId) {
  const classifier = await get(classifierId, { attributes: ['model_url'] })
  const classifierUrl = classifier.model_url
  const match = classifierUrl.match(/^s3:\/\/(?<bucket>[a-z][a-z0-9-]*)\/(?<path>.+)$/)
  if (!match) {
    throw new EmptyResultError('Classifier model url not recognised')
  }
  const classifierBucket = match.groups.bucket
  const storagePath = match.groups.path
  return await storageService.getSignedUrl(classifierBucket, storagePath)
}

module.exports = {
  getSignedUrl
}
