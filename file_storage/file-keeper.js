var Promise = require("bluebird");
// https://www.npmjs.com/package/knox
var S3 = require("knox");

module.exports = {
  
   /**
	 * put the file at the filePath into the bucket with bucketName
	 *
	 * @param {String} filePath
	 * @param {String} bucketName
	 * @return {Promise} Promise with response
	 * @api public
	 */
  putFile: function(filePath, bucketName, fileName) {
    var self = this;
    return new Promise(function(resolve,reject){
      self.getClient(bucketName).putFile(filePath, fileName, function(err, s3Res){
        try{
          s3Res.resume();
        } catch (e) {
          reject(e);
        }
        if (!!err) {
          reject(new Error(err));
        } else {
          resolve(s3Res);
        }
      });
    })
  },

  /**
	 * delete a file nameed fileName from a bucket with bucketName
	 *
	 * @param {String} fileName
	 * @param {String} bucketName
	 * @return {Promise} Promise with response
	 * @api public
	 */
  deleteFile: function(fileName, bucketName) {
    var self = this;
    return new Promise(function(resolve,reject){
      self.getClient(bucketName).deleteFile(fileName, function(err, s3Res){
        try{
          s3Res.resume();
        } catch (e) {
          reject(e);
        }
        if (!!err) {
          reject(new Error(err));
        } else {
          resolve(s3Res);
        }
      });
    });
  },
  
  /**
	 * get a file nameed fileName from a bucket with bucketName
	 *
	 * @param {String} fileName
	 * @param {String} bucketName
	 * @return {Promise} Promise with response
	 * @api public
	 */
  getFile: function(fileName, bucketName) {
    var self = this;
    return new Promise(function(resolve,reject){
      self.getClient(bucketName).getFile(fileName, function(err, s3Res){
        if (!!err) {
          reject(new Error(err));
        } else {
          //res.on('data', function(data) { file.write(data); });
          //res.on('end', function(chunk) { file.end(); });
          resolve(s3Res);
        }
      });
    })
  },
  
  /**
	 * return a client for accessing files in the specified bucket
	 *
	 * @param {String} bucketName
	 * @return {Promise} Promise with response
	 * @api private
	 */
  getClient: function(bucketName) {
    return S3.createClient({
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION_ID,
      bucket: bucketName
    });
  }
  
};

