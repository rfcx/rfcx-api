var crypto = require("crypto");
var Promise = require("bluebird");
var csprng = require("csprng");
var sha = require("sha.js");
var fs = require("fs");
var pfs = Promise.promisifyAll(require("fs"));

exports.hash = {

  /**
	 * return a hash of the provided data
	 *
	 * @param {String} data
	 * @return {String} hash
	 * @api private
	 */
  hashData: function(data) {
    return crypto
      .createHash("sha1")
      .update(data)
      .digest("hex");
  },
  
  /**
	 * return a hash of the file at filePath
	 *
	 * @param {String} filePath
	 * @return {String} hash
	 * @api public
	 */
  fileSha1: function(filePath) {
    return this.hashData(fs.readFileSync(filePath));
  },
  
  /**
	 * return a promise to create a hash of the file at filePath
	 *
	 * @param {String} filePath
	 * @return {Promise} with hash entity
	 * @api public
	 */
  fileSha1Async: function (filePath) {
    //if no file path given, return a promise that resolves to null
    if (!filePath) {
      return new Promise(function(resolve) {
          resolve(null);
      });  
    }
    var self = this;
    //else return a promise that resolves to a hash of the file
    return pfs.readFileAsync(filePath)
    .then(function (data) {
      return self.hashData(data);
    });
  },

  /**
   * return a CSPRNG random 'hash' string
   *
   * @param {Integer} bits
   * @return {String} hash
   * @api private
   */
  randomHash: function(bits) {
    return csprng(bits,36);
  },

  /**
   * return a CSPRNG random 'token' string
   *
   * @param {String} length
   * @return {String} token
   * @api private
   */
  randomString: function(length) {
    return this.randomHash(320).substr(0,length);
  },

  /**
   * return a SHA256 hash of salted password/token
   *
   * @param {String} salt
   * @param {String} secret
   * @return {String} hash
   * @api private
   */
  hashedCredentials: function(salt,secret) {
    var sha256 = sha("sha256");
    return sha256.update(salt+secret,"utf8").digest("hex");
  },

  

};

