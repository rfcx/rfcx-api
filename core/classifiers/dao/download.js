const storageService = require('../../_services/storage')
const { EmptyResultError } = require('../../../common/error-handling/errors')

/**
 * Download a storage file
 * @param {string} storageUrl
 */
async function getSignedUrl (storageUrl) {
  const match = storageUrl.match(/^s3:\/\/(?<bucket>[a-z][a-z0-9-]*)\/(?<path>.+)$/)
  if (!match) {
    throw new EmptyResultError('Storage url not recognised')
  }
  const storageBucket = match.groups.bucket
  const storagePath = match.groups.path
  return await storageService.getSignedUrl(storageBucket, storagePath)
}

module.exports = {
  getSignedUrl
}
