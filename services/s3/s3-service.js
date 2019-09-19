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

function getObject(localPath, filename, bucket) {
  return new Promise((resolve, reject) => {
    try {
      var s3Path = filename;
      aws.s3(bucket).get(s3Path)
        .on('response', function(s3Res){
          var tempWriteStream = fs.createWriteStream(localPath);
          tempWriteStream.on('error', function(err){ console.log(err); });
          s3Res.on('data', function(data){ tempWriteStream.write(data); });
          s3Res.on('end', function(){ tempWriteStream.end(); });
          s3Res.on('error', function(err){ console.log(err); });
          tempWriteStream.on('finish', function(){
              fs.stat(localPath, function(statErr,fileStat){
                  if (statErr == null) {
                      resolve({ localPath, headers: s3Res.headers });
                  } else {
                      console.log('Model not found...');
                      reject(new Error());
                  }
              });
          });
        }).end();
      } catch(err) {
        console.log("failed to download model from s3 | " + err);
        reject(new Error(err));
    }
  });
}

module.exports = {
  putObject: putObject,
  getObject: getObject,
};
