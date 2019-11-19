var Promise = require('bluebird');
var fs = require('fs');
var AWS = require("aws-sdk");
var aws = require('../../utils/external/aws').aws();
const loggers  = require('../../utils/logger');
const logError = loggers.errorLogger.log;

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

function deleteObject(bucket, fullPath) {
  return new Promise((resolve, reject) => {
      aws.s3(bucket).deleteFile(fullPath, (err, res) => {
        res.resume();
        if (err) { return reject(err); }
        return resolve();
      });
  });
}

function getObject(localPath, filename, bucket) {
  return new Promise((resolve, reject) => {
    try {
      var s3Path = filename;
      var sourceFilePath = `${localPath}/${filename}`;
      // First of all, check that file exists
      aws.s3(bucket)
        .headFile(s3Path, (err, data) => {
          if (err) {
            reject(err);
          }
          else if (data && data.statusCode === 200) {
            aws.s3(bucket)
              .get(s3Path)
              .on('response', (s3Res) => {
                let tempWriteStream = fs.createWriteStream(sourceFilePath);
                tempWriteStream.on('error', (errTempWriteStream) => { reject(errTempWriteStream); });
                s3Res.on('data', (data) => { tempWriteStream.write(data); });
                s3Res.on('end', () => { tempWriteStream.end(); });
                s3Res.on('error', (errS3Res) => { reject(errS3Res) });
                tempWriteStream.on('finish', () => {
                  fs.stat(sourceFilePath, (statErr, fileStat) => {
                    if (statErr) {
                      reject(statErr);
                    }
                    else {
                      resolve({ sourceFilePath, headers: s3Res.headers });
                    }
                  });
                });
              })
              .end();
          }
          else {
            reject(new Error(`Failed to get object from S3. Status code: ${data.statusCode}`));
          }
      });
    }
    catch(err) {
      logError('Failed to get object from S3', err);
      reject(new Error(err));
    }
  });
}

module.exports = {
  putObject,
  getObject,
  deleteObject,
};
