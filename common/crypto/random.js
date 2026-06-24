const csprng = require('csprng')
const crypto = require('crypto')
/**
   * A CSPRNG random string
   *
   * @param {String} length
   * @return {String} token
   * @api private
   */
function randomString (length) {
  // TODO Replace csprng dependency with pure crypto solution
  return csprng(320, 36).substr(0, length)
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
   * A DETERMINISTIC, UUID-v5-shaped guid derived from an input string, so the
   * same input (e.g. an auth0 `sub` or a machine client id) always maps to the
   * same users.guid. Used to give identity-less-but-signed tokens a stable
   * principal instead of collapsing them onto the shared `userless` account.
   *
   * @param {string} input
   * @return {string} deterministic 36-char UUID-shaped identifier
   */
function stableGuidFromString (input) {
  const h = crypto.createHash('sha1').update(String(input)).digest('hex')
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16), // version nibble -> 5 (name-based)
    ((parseInt(h.slice(16, 17), 16) & 0x3 | 0x8).toString(16)) + h.slice(17, 20), // variant
    h.slice(20, 32)
  ].join('-')
}

module.exports = { randomString, randomId, randomGuid, stableGuidFromString }
