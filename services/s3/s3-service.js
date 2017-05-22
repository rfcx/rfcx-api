var Promise = require('bluebird');
var fs = require('fs');
var AWS = require("aws-sdk");
var aws = require('../../utils/external/aws').aws();
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });

/**
 * Uploads file to S3 storage
 * @param {string} localPath - path to local file
 * @param {string} filename - file name which will be used in S3
 * @param {string} bucket - S3 Bucket name
 */
function putObject(localPath, filename, bucket) {
  return new Promise((resolve, reject) => {
      aws.s3(bucket).putFile(localPath, filename, (err, res) => {
        res.resume();
        if (err) { return reject(err); }
        return resolve();
      });
  });
}

/**
 * Returns public accessible url to file at S3
 * @param {string} bucket - S3 Bucket name
 * @param {string} filename - file name at S3 storage
 * @param {number} [expires=900] - file name at S3 storage (sec)
 * @returns {string} url - file url at S3
 */
function getObjectUrl(bucket, filename, expires = 900) {
  const params = {
    Bucket: bucket,
    Key: filename,
    Expires: expires
  };
  const url = s3.getSignedUrl('getObject', params);
  return url;
}

module.exports = {
  putObject: putObject,
  getObjectUrl: getObjectUrl
};
