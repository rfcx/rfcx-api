const crypto = require('crypto')
const Promise = require('bluebird')
const csprng = require('csprng')
const sha = require('sha')
const fs = require('fs')
const pfs = Promise.promisifyAll(require('fs'))

/**
  * return a hash of the provided data
  *
  * @param {String} data
  * @return {String} hash
  * @api private
  */
function hashData (data) {
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
  return hashData(fs.readFileSync(filePath))
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
  const self = this
  // else return a promise that resolves to a hash of the file
  return pfs.readFileAsync(filePath)
    .then(function (data) {
      return self.hashData(data)
    })
}

/**
   * return a CSPRNG random 'hash' string
   *
   * @param {Integer} bits
   * @return {String} hash
   * @api private
   */
function randomHash (bits) {
  return csprng(bits, 36)
}

/**
   * return a CSPRNG random 'token' string
   *
   * @param {String} length
   * @return {String} token
   * @api private
   */
function randomString (length) {
  return randomHash(320).substr(0, length)
}

/**
   * A random 12-char id
   *
   * @return {string} 12-character identifer in lowercase
   */
function randomId () {
  return randomString(12).toLowerCase()
}

function randomGuid () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4()
}

/**
   * return a SHA256 hash of salted password/token
   *
   * @param {String} salt
   * @param {String} secret
   * @return {String} hash
   * @api private
   */
function hashedCredentials (salt, secret) {
  const sha256 = sha('sha256')
  return sha256.update(salt + secret, 'utf8').digest('hex')
}

module.exports = { hashData, hashedCredentials, fileSha1, fileSha1Async, randomString, randomHash, randomId, randomGuid }
