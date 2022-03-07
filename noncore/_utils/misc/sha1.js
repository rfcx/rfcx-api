const crypto = require('crypto')
const Promise = require('bluebird')
const fs = require('fs')
const pfs = Promise.promisifyAll(require('fs'))

/**
  * return a hash of the provided data
  *
  * @param {String} data
  * @return {String} hash
  * @api private
  */
function sha1 (data) {
  return crypto
    .createHash('sha1')
    .update(data)
    .digest('hex')
}

/**
  * return a hash of the file at filePath
  *
  * @param {String} filePath
  * @return {String} hash
  * @api public
  */
function fileSha1 (filePath) {
  return sha1(fs.readFileSync(filePath))
}

/**
  * return a promise to create a hash of the file at filePath
  *
  * @param {String} filePath
  * @return {Promise} with hash entity
  * @api public
  */
function fileSha1Async (filePath) {
  // if no file path given, return a promise that resolves to null
  if (!filePath) {
    return new Promise(function (resolve) {
      resolve(null)
    })
  }
  // else return a promise that resolves to a hash of the file
  return pfs.readFileAsync(filePath)
    .then(function (data) {
      return sha1(data)
    })
}

module.exports = { sha1, fileSha1, fileSha1Async }
