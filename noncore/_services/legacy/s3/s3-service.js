// TODO: replace with services/storage/amazon

const Promise = require('bluebird')
const fs = require('fs')
const aws = require('../../../_utils/external/aws').aws()

/**
 * Uploads file to S3 storage
 * @param {string} localPath - path to local file
 * @param {string} filename - file name which will be used in S3
 * @param {string} bucket - S3 Bucket name
 */
function putObject (localPath, filename, bucket, acl) {
  return new Promise((resolve, reject) => {
    if (acl) {
      aws.s3(bucket).putFile(localPath, filename, { 'x-amz-acl': 'public-read' }, (err, res) => {
        res.resume()
        if (err) { return reject(err) }
        return resolve()
      })
    } else {
      aws.s3(bucket).putFile(localPath, filename, (err, res) => {
        if (res) { res.resume() }
        if (err) { return reject(err) }
        return resolve()
      })
    }
  })
}

/**
 * Creates a copy of an object that is already stored in Amazon S3
 * @param {string} sourcePath - source path including bucket name
 * @param {string} destinationBucket - destination bucket name
 * @param {string} destinationPath - path to copy to
 */
function copyObject (sourceBucket, sourcePath, destinationBucket, destinationPath) {
  return new Promise((resolve, reject) => {
    aws.s3(sourceBucket).copyTo(sourcePath, destinationBucket, destinationPath)
      .on('error', function (err) {
        reject(err)
      })
      .on('response', function (res) {
        resolve()
      })
      .end()
  })
}

function deleteObject (bucket, fullPath) {
  return new Promise((resolve, reject) => {
    aws.s3(bucket).deleteFile(fullPath, (err, res) => {
      res.resume()
      if (err) { return reject(err) }
      return resolve()
    })
  })
}

async function deleteObjects (bucket, keys) {
  return new Promise((resolve, reject) => {
    let index = 0
    const step = 1000
    while (keys.slice(index * step, index * step + step).length) {
      const start = index * step
      const end = index * step + step
      console.info(`deleting ${start} - ${end} of ${keys.length} files from ${bucket}`)
      const curKeys = keys.slice(start, end)
      aws.s3(bucket).deleteMultiple(curKeys, (err, res) => {
        res.resume()
        if (err) { return reject(err) }
        return resolve()
      })
      index++
    }
  })
}

function headObject (s3Path, bucket, dontRejectIfEmpty) {
  return new Promise((resolve, reject) => {
    aws.s3(bucket).headFile(s3Path, (err, data) => {
      if (err) { return reject(err) } else if (data && data.statusCode === 200) {
        return resolve(data)
      } else {
        if (dontRejectIfEmpty) {
          return resolve(null)
        } else {
          reject(new Error(`Failed to get object from S3. Status code: ${data.statusCode}`))
        }
      }
    })
  })
}

function getObject (localPath, filename, bucket) {
  return new Promise((resolve, reject) => {
    try {
      const s3Path = filename
      const sourceFilePath = `${localPath}/${filename}`
      // First of all, check that file exists
      aws.s3(bucket)
        .headFile(s3Path, (err, data) => {
          if (err) {
            reject(err)
          } else if (data && data.statusCode === 200) {
            aws.s3(bucket)
              .get(s3Path)
              .on('response', (s3Res) => {
                const tempWriteStream = fs.createWriteStream(sourceFilePath)
                tempWriteStream.on('error', (errTempWriteStream) => { reject(errTempWriteStream) })
                s3Res.on('data', (data) => { tempWriteStream.write(data) })
                s3Res.on('end', () => { tempWriteStream.end() })
                s3Res.on('error', (errS3Res) => { reject(errS3Res) })
                tempWriteStream.on('finish', () => {
                  fs.stat(sourceFilePath, (statErr, fileStat) => {
                    if (statErr) {
                      reject(statErr)
                    } else {
                      resolve({ sourceFilePath, headers: s3Res.headers })
                    }
                  })
                })
              })
              .end()
          } else {
            reject(new Error(`Failed to get object from S3. Status code: ${data.statusCode}`))
          }
        })
    } catch (err) {
      console.error('Failed to get object from S3', err)
      reject(new Error(err))
    }
  })
}

module.exports = {
  putObject,
  copyObject,
  headObject,
  getObject,
  deleteObject,
  deleteObjects
}
