const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const s3Client = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION_ID
})

function getSignedUrl (bucket, key, contentType, expires = 86400, write = false) {
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expires,
    ContentType: contentType
  }
  const operation = write ? 'putObject' : 'getObject'
  return (new Promise((resolve, reject) => {
    s3Client.getSignedUrl(operation, params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  }))
}

function exists (Bucket, Key) {
  return new Promise((resolve, reject) => {
    s3Client.headObject({ Bucket, Key }, (headErr, data) => {
      return resolve(!headErr)
    })
  })
}

async function listFiles (Bucket, path) {
  const files = await s3Client.listObjects({ Bucket, Prefix: path }).promise()
  return files.Contents
}

function getFilePath (file) {
  return file.Key
}

function download (Bucket, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    try {
      s3Client.headObject({
        Bucket,
        Key: remotePath
      }, (headErr, data) => {
        if (headErr) { reject(headErr) }
        const tempWriteStream = fs.createWriteStream(localPath)
        const tempReadStream = s3Client.getObject({
          Bucket,
          Key: remotePath
        })
          .createReadStream()

        tempReadStream.on('error', (errS3Res) => { reject(errS3Res) })

        tempReadStream
          .pipe(tempWriteStream)
          .on('error', (errWrite) => { reject(errWrite) })
          .on('close', () => {
            fs.stat(localPath, (statErr, fileStat) => {
              if (statErr) { reject(statErr) } else { resolve() }
            })
          })
      })
    } catch (err) {
      reject(new Error(err))
    }
  })
}

function getReadStream (Bucket, Key) {
  return s3Client
    .getObject({ Bucket, Key })
    .createReadStream()
}

function upload (Bucket, Key, localPath) {
  const fileStream = fs.readFileSync(localPath)
  const opts = {
    Bucket,
    Key,
    Body: fileStream
  }
  return s3Client.putObject(opts).promise()
}

function uploadBuffer (Bucket, Key, buffer) {
  const opts = {
    Bucket,
    Key,
    Body: buffer
  }
  return s3Client.upload(opts).promise()
}

function deleteFile (Bucket, Key) {
  const opts = { Bucket, Key }
  return s3Client.deleteObject(opts).promise()
}

function deleteFiles (Bucket, Keys) {
  const params = {
    Bucket,
    Delete: {
      Objects: Keys,
      Quiet: false
    }
  }
  return new Promise((resolve, reject) => {
    s3Client.deleteObjects(params, (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

module.exports = {
  getSignedUrl,
  exists,
  listFiles,
  getFilePath,
  download,
  getReadStream,
  upload,
  uploadBuffer,
  deleteFile,
  deleteFiles
}
