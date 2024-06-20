const fs = require('fs')
const zlib = require('zlib')
const { fileSha1 } = require('../misc/sha1')
const random = require('../../../common/crypto/random')
const aws = require('../external/aws').aws()
const assetUtils = require('../internal-rfcx/asset-utils').assetUtils
const Promise = require('bluebird')
const guardianMsgParsingUtils = require('../rfcx-guardian/guardian-msg-parsing-utils').guardianMsgParsingUtils
const { upload } = require('../internal-rfcx/ingest-file-upload')
const moment = require('moment-timezone')
const path = require('path')

exports.mqttInputData = {

  parseCheckInInput: function (mqttData) {
    return new Promise(function (resolve, reject) {
      try {
        const metaLength = 12
        const jsonBlobLength = parseInt(mqttData.toString('utf8', 0, metaLength))
        const audioFileLength = parseInt(mqttData.toString('utf8', metaLength + jsonBlobLength, metaLength + jsonBlobLength + metaLength))
        const screenShotFileLength = parseInt(mqttData.toString('utf8', metaLength + jsonBlobLength + metaLength + audioFileLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength))
        const logFileLength = parseInt(mqttData.toString('utf8', metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength))
        const photoFileLength = parseInt(mqttData.toString('utf8', metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength + metaLength))
        const videoFileLength = parseInt(mqttData.toString('utf8', metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength + metaLength + photoFileLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength + metaLength + photoFileLength + metaLength))

        const audioFileBuffer = mqttData.slice(metaLength + jsonBlobLength + metaLength, metaLength + jsonBlobLength + metaLength + audioFileLength)
        const screenShotFileBuffer = mqttData.slice(metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength)
        const logFileBuffer = mqttData.slice(metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength)
        const photoFileBuffer = mqttData.slice(metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileBuffer + metaLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength + metaLength + photoFileLength)
        const videoFileBuffer = mqttData.slice(metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileBuffer + metaLength + photoFileBuffer + metaLength, metaLength + jsonBlobLength + metaLength + audioFileLength + metaLength + screenShotFileLength + metaLength + logFileLength + metaLength + photoFileLength + metaLength + videoFileLength)

        zlib.gunzip(mqttData.slice(metaLength, metaLength + jsonBlobLength), function (jsonError, jsonBuffer) {
          if (jsonError) {
            reject(jsonError)
          }

          const checkInObj = guardianMsgParsingUtils.constructGuardianMsgObj(JSON.parse(jsonBuffer.toString('utf8')), null, null)

          // Adding support for differently structured guardian JSON blobs, which don't support auth.
          // This supports guardian software deployed before May 2020.
          // THIS SHOULD BE REMOVED when those guardians are taken offline.
          if (checkInObj.json.guardian == null) { checkInObj.json.guardian = {} }
          if (checkInObj.json.guardian_guid != null) {
            checkInObj.json.guardian.guid = checkInObj.json.guardian_guid
          }
          // THE ABOVE CODE SHOULD BE REMOVED when those guardians are taken offline.

          checkInObj.audio.metaArr = (strArrToJSArr(checkInObj.json.audio, '|', '*').length === 0) ? [] : strArrToJSArr(checkInObj.json.audio, '|', '*')[0]
          cacheFileBufferToFile(audioFileBuffer, true, checkInObj.audio.metaArr[3], checkInObj.audio.metaArr[2])
            .then(function (audioFileCacheFilePath) {
              checkInObj.audio.filePath = audioFileCacheFilePath
              return saveAssetFileToS3('audio', checkInObj)
            })
            .then(function (checkInObj) {
              checkInObj.screenshots.metaArr = (strArrToJSArr(checkInObj.json.screenshots, '|', '*').length === 0) ? [] : strArrToJSArr(checkInObj.json.screenshots, '|', '*')[0]
              return cacheFileBufferToFile(screenShotFileBuffer, false, checkInObj.screenshots.metaArr[3], checkInObj.screenshots.metaArr[2])
            })
            .then(function (screenShotCacheFilePath) {
              checkInObj.screenshots.filePath = screenShotCacheFilePath
              return saveAssetFileToS3('screenshots', checkInObj)
            })
            .then(function (checkInObj) {
              checkInObj.logs.metaArr = (strArrToJSArr(checkInObj.json.logs, '|', '*').length === 0) ? [] : strArrToJSArr(checkInObj.json.logs, '|', '*')[0]
              return cacheFileBufferToFile(logFileBuffer, true, checkInObj.logs.metaArr[3], checkInObj.logs.metaArr[2])
            })
            .then(function (logFileCacheFilePath) {
              checkInObj.logs.filePath = logFileCacheFilePath
              return saveAssetFileToS3('logs', checkInObj)
            })
            .then(function (checkInObj) {
              checkInObj.photos.metaArr = (strArrToJSArr(checkInObj.json.photos, '|', '*').length === 0) ? [] : strArrToJSArr(checkInObj.json.photos, '|', '*')[0]
              return cacheFileBufferToFile(photoFileBuffer, true, checkInObj.photos.metaArr[3], checkInObj.photos.metaArr[2])
            })
            .then(function (photoCacheFilePath) {
              checkInObj.photos.filePath = photoCacheFilePath
              return saveAssetFileToS3('photos', checkInObj)
            })
            .then(function (checkInObj) {
              checkInObj.videos.metaArr = (strArrToJSArr(checkInObj.json.videos, '|', '*').length === 0) ? [] : strArrToJSArr(checkInObj.json.videos, '|', '*')[0]
              return cacheFileBufferToFile(videoFileBuffer, true, checkInObj.videos.metaArr[3], checkInObj.videos.metaArr[2])
            })
            .then(function (videoCacheFilePath) {
              checkInObj.videos.filePath = videoCacheFilePath
              return saveAssetFileToS3('videos', checkInObj)
            })
            .then(function (checkInObj) {
              resolve(checkInObj)
            })
            .catch((err) => {
              reject(err)
            })
        })
      } catch (errParsecheckInObj) {
        console.error(errParsecheckInObj)
        reject(errParsecheckInObj)
      }
    })
  }

}

async function saveAssetFileToS3 (assetType, checkInObj) {
  if (checkInObj[assetType].filePath == null) {
    return checkInObj
  } else {
    let s3Path = assetUtils.getGuardianAssetStoragePath(assetType, new Date(parseInt(checkInObj[assetType].metaArr[1])), checkInObj.json.guardian.guid, checkInObj[assetType].metaArr[2])
    let s3Bucket = process.env.ASSET_BUCKET_META
    if (assetType === 'audio') {
      const uploadData = await upload({
        filename: path.basename(checkInObj.audio.meta.s3Path),
        timestamp: moment.tz(checkInObj.audio.meta.measuredAt, 'UTC').toISOString(),
        stream: checkInObj.db.dbGuardian.stream_id,
        checksum: checkInObj.audio.meta.sha1CheckSum,
        targetBitrate: checkInObj.audio.meta.bitRate,
        sampleRate: checkInObj.audio.meta.sampleRate
      })
      s3Bucket = uploadData.bucket
      s3Path = uploadData.path
    }

    aws.s3(s3Bucket).putFile(checkInObj[assetType].filePath, s3Path, function (s3SaveErr, s3Res) {
      try { s3Res.resume() } catch (resumeErr) { console.error(resumeErr) }

      if (s3SaveErr) {
        console.error(s3SaveErr)
        throw new Error(s3SaveErr)
      } else if ((s3Res.statusCode === 200) && aws.s3ConfirmSave(s3Res, s3Path)) {
        return checkInObj
      } else {
        console.error('S3 Save result', s3Res)
        throw new Error('asset file (' + assetType + ') could not be saved to s3')
      }
    })
  }
}

function cacheFileBufferToFile (fileBuffer, isGZipped, fileSha1Hash, fileExtension) {
  return new Promise(function (resolve, reject) {
    try {
      if (fileBuffer.length === 0) {
        resolve(null)
      } else {
        const tmpFilePath = process.env.CACHE_DIRECTORY + 'uploads/' + random.randomString(36) + '.' + fileExtension + (isGZipped ? '.gz' : '')

        fs.writeFile(tmpFilePath, fileBuffer, 'binary', function (errWriteFile) {
          if (errWriteFile) { console.error(errWriteFile); reject(new Error(errWriteFile)) } else {
            try {
              if (!isGZipped) {
                if ((fileSha1Hash == null) || (fileSha1Hash === fileSha1(tmpFilePath))) {
                  resolve(tmpFilePath)
                } else {
                  console.error('checksum mismatch: ' + tmpFilePath); reject(new Error('checksum mismatch: ' + tmpFilePath))
                }
              } else {
                try {
                  const tmpFilePathUnZipped = process.env.CACHE_DIRECTORY + 'uploads/' + random.randomString(36) + '.' + fileExtension
                  const unZipStream = fs.createWriteStream(tmpFilePathUnZipped)
                  unZipStream.on('close', function () {
                    fs.unlink(tmpFilePath, () => { })
                    if ((fileSha1Hash == null) || (fileSha1Hash === fileSha1(tmpFilePathUnZipped))) {
                      resolve(tmpFilePathUnZipped)
                    } else {
                      console.error('checksum mismatch: ' + tmpFilePathUnZipped); reject(new Error('checksum mismatch: ' + tmpFilePathUnZipped))
                    }
                  })
                  fs.createReadStream(tmpFilePath).pipe(zlib.createGunzip()).pipe(unZipStream)
                } catch (errFileUnZip) { console.error(errFileUnZip); reject(new Error(errFileUnZip)) }
              }
            } catch (errWriteFileInner) { console.error(errWriteFileInner); reject(new Error(errWriteFileInner)) }
          }
        })
      }
    } catch (errCacheFileBufferToFile) { console.error(errCacheFileBufferToFile); reject(new Error(errCacheFileBufferToFile)) }
  })
}

// // Special Functions

function strArrToJSArr (str, delimA, delimB) {
  if ((str == null) || (str.length === 0)) { return [] }
  try {
    const rtrnArr = []; const arr = str.split(delimA)
    if (arr.length > 0) {
      for (const i in arr) {
        rtrnArr.push(arr[i].split(delimB))
      }
      return rtrnArr
    } else {
      return []
    }
  } catch (e) {
    console.error(e)
    return []
  }
}
