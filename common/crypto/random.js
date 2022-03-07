const csprng = require('csprng')
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

module.exports = { randomString, randomId, randomGuid }
