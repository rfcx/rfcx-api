const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const s3Client = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION_ID
})

function getSignedUrl (Bucket, Key, ContentType, Expires = 86400) {
  const params = {
    Bucket,
    Key,
    Expires,
    ContentType
  }
  return (new Promise((resolve, reject) => {
    s3Client.getSignedUrl('putObject', params, (err, data) => {
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

async function listFiles (Bucket, path, StartAfter = null) {
  const files = await s3Client.listObjectsV2({ Bucket, Prefix: path, StartAfter }).promise()
  return files.Contents
}

async function listAllFiles (Bucket, path) {
  let allFiles = []
  let isLoading = true
  while (isLoading) {
    const lastKey = allFiles.length? allFiles[allFiles.length - 1].Key : null
    // console.log('loop', lastKey)
    const files = await listFiles(Bucket, path, lastKey)
    if (!files.length) {
      isLoading = false
    } else {
      allFiles = allFiles.concat(files)
    }
  }
  return allFiles
}

setTimeout(() => {
  listAllFiles('pr-temp-bucket', 'LU41-lz2YSHMvXQ8w/LU 41(FLAC)')
    .then((files) => {
      files = files.filter(f => f.Key.endsWith('.flac'))
      let missing = files.filter(f => !ff.includes(f.Key.replace('LU41-lz2YSHMvXQ8w/LU 41(FLAC)/', '')))
      const deleteNames = missing.map((file) => {
          return { Key: file.Key.replace('.flac', '.failed') }
        })
      console.log('\n\ndeleteNames', deleteNames, '\n\n')
      deleteNames.forEach((n) => {
        deleteFiles('pr-temp-bucket', [n])
      })
      // console.log('\n\nmissing', missing, '\n\n')
      // files = files.filter(f => f.Key.endsWith('.ingested'))
      // const deleteNames = files.map((file) => {
        //   return { Key: file.Key }
        // })
        // console.log('\n\ndeleteNames', deleteNames, '\n\n')
        // deleteNames.forEach((n) => {
          //   deleteFiles('pr-temp-bucket', [n])
          // })
      // const flacFiles = files.filter(f => f.Key.endsWith('.flac')).map(f => f.Key.replace('.flac', ''))
      // const infoFiles = files.filter(f => f.Key.endsWith('.ingested')).map(f => f.Key.replace('.ingested', ''))
      // console.log('\n\ncompare', flacFiles.length, infoFiles.length, '\n\n')
      // const missingFiles = flacFiles.filter(f => !infoFiles.includes(f))
      // console.log('\n\n', missingFiles, '\n\n')
    })
    .catch((err) => {
      console.log('err', err)
    })
}, 3000)

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
