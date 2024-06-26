const Promise = require('bluebird')
const fs = require('fs')
const random = require('../../../common/crypto/random')
const aws = require('../../_utils/external/aws').aws()
const { EmptyResultError } = require('../../../common/error-handling/errors')

exports.audioUtils = {

  cacheSourceAudio: function (s3Url) {
    return new Promise(function (resolve, reject) {
      try {
        const s3NoProtocol = s3Url.substr(s3Url.indexOf('://') + 3)
        const s3Bucket = s3NoProtocol.substr(0, s3NoProtocol.indexOf('/'))
        const s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf('/'))

        const hashName = random.randomString(32)
        const audioFileExtension = s3Path.substr(1 + s3Path.lastIndexOf('.'))
        const sourceFilePath = process.env.CACHE_DIRECTORY + 'ffmpeg/' + hashName + '.' + audioFileExtension

        aws.s3(s3Bucket).get(s3Path)
          .on('response', function (s3Res) {
            if (s3Res && s3Res.statusCode === 404) {
              return reject(new EmptyResultError(s3Res.statusMessage || 'File not found.'))
            }
            const tempWriteStream = fs.createWriteStream(sourceFilePath)
            tempWriteStream.on('error', function (err) { console.error(err) })
            s3Res.on('data', function (data) { tempWriteStream.write(data) })
            s3Res.on('end', function () { tempWriteStream.end() })
            s3Res.on('error', function (err) { console.error(err) })
            tempWriteStream.on('finish', function () {
              fs.stat(sourceFilePath, function (statErr, fileStat) {
                if (statErr == null) {
                  resolve({ sourceFilePath, headers: s3Res.headers })
                } else {
                  console.error('Audio file not found...')
                  reject(new Error())
                }
              })
            })
          }).end()
      } catch (err) {
        console.error('failed to download audio from s3 | ' + err)
        reject(new Error(err))
      }
    })
  }

}
