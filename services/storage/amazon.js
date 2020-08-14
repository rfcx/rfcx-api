const fs = require('fs');
const AWS = require("aws-sdk");

const ingestBucket = process.env.INGEST_BUCKET;

const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION_ID
});

function getSignedUrl (Bucket, Key, ContentType, Expires = 86400) {
  const params = {
    Bucket,
    Key,
    Expires,
    ContentType
  };
  return (new Promise((resolve, reject) => {
    s3Client.getSignedUrl('putObject', params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    });
  }));
}

function exists(Bucket, Key) {
  return new Promise((resolve, reject) => {
    s3Client.headObject({ Bucket, Key }, (headErr, data) => {
      return resolve(!headErr);
    })
  })
}

function download (Bucket, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    try {
      s3Client.headObject({
        Bucket,
        Key: remotePath
      }, (headErr, data) => {
        if (headErr) { reject(headErr); }
        let tempWriteStream = fs.createWriteStream(localPath);
        let tempReadStream  = s3Client.getObject({
          Bucket,
          Key: remotePath
        })
        .createReadStream()

        tempReadStream.on('error', (errS3Res) => { reject(errS3Res) });

        tempReadStream
          .pipe(tempWriteStream)
          .on('error', (errWrite) => { reject(errWrite); })
          .on('close', () => {
            fs.stat(localPath, (statErr, fileStat) => {
              if (statErr) { reject(statErr) }
              else { resolve() }
            });
          });
      });
    }
    catch(err) {
      reject(new Error(err));
    }
  });
}

function getReadStream(Bucket, Key) {
  return s3Client
    .getObject({ Bucket, Key })
    .createReadStream()
}

function upload(Bucket, Key, localPath) {
  const fileStream = fs.readFileSync(localPath);
  const opts = {
    Bucket,
    Key,
    Body: fileStream
  };
  return s3Client.putObject(opts).promise();
}

function deleteFile(Bucket, Key) {
  const opts = { Bucket, Key };
  return s3Client.deleteObject(opts).promise();
}

function deleteFiles(Bucket, Keys) {
  let params = {
    Bucket,
    Delete: {
      Objects: Keys,
      Quiet: false
    }
  };
  return new Promise((resolve, reject) => {
    s3Client.deleteObjects(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  })
}

module.exports = {
  getSignedUrl,
  exists,
  download,
  getReadStream,
  upload,
  deleteFile,
  deleteFiles,
}
