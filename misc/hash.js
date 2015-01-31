var crypto = require("crypto");
var Promise = require("bluebird");
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
  }

};

