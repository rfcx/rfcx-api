const sha = require('sha.js')

/**
 * A SHA256 hash of salted password/token
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

module.exports = { hashedCredentials }
