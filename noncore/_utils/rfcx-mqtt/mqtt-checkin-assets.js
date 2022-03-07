const Promise = require('bluebird')
const fs = require('fs')
const exec = require('child_process').exec
const audioUtils = require('../rfcx-audio').audioUtils
const assetUtils = require('../internal-rfcx/asset-utils').assetUtils

exports.checkInAssets = {

  extractAudioFileMeta: function (checkInObj) {
    return new Promise(function (resolve, reject) {
      try {
        fs.stat(checkInObj.audio.filePath, function (statErr, fileStat) {
          if (statErr) { reject(statErr) }

          checkInObj.audio.meta = {
            size: fileStat.size,
            measuredAt: new Date(parseInt(checkInObj.audio.metaArr[1])),
            sha1CheckSum: checkInObj.audio.metaArr[3],
            sampleRate: parseInt(checkInObj.audio.metaArr[4]),
            bitRate: parseInt(checkInObj.audio.metaArr[5]),
            audioCodec: checkInObj.audio.metaArr[6],
            fileExtension: checkInObj.audio.metaArr[2],
            isVbr: (checkInObj.audio.metaArr[7].toLowerCase() === 'vbr'),
            encodeDuration: parseInt(checkInObj.audio.metaArr[8]),
            mimeType: assetUtils.mimeTypeFromAudioCodec(checkInObj.audio.metaArr[6]),
            s3Path: assetUtils.getGuardianAssetStoragePath('audio', new Date(parseInt(checkInObj.audio.metaArr[1])), checkInObj.json.guardian.guid, checkInObj.audio.metaArr[2])
          }

          audioUtils.transcodeToFile('wav', {
            sourceFilePath: checkInObj.audio.filePath,
            sampleRate: checkInObj.audio.meta.sampleRate
          })
            .then(function (wavFilePath) {
              fs.stat(wavFilePath, function (wavStatErr, wavFileStat) {
                if (wavStatErr !== null) { reject(wavStatErr) }

                exec(process.env.SOX_PATH + 'i -s ' + wavFilePath, function (err, stdout, stderr) {
                  if (stderr.trim().length > 0) { console.error(stderr) }
                  if (err) { console.error(err); reject(err) }

                  checkInObj.audio.meta.captureSampleCount = parseInt(stdout.trim())
                  assetUtils.deleteLocalFileFromFileSystem(wavFilePath)
                  resolve(checkInObj)
                })
              })
            })
        })
      } catch (err) {
        console.error('ExtractAudioFileMeta: common error', err)
        reject(err)
      }
    })
  }

}
