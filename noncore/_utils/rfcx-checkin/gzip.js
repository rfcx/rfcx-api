const Promise = require('bluebird')
const querystring = require('querystring')
const zlib = require('zlib')

exports.gzip = {

  unZipJson: function (gZippedJson) {
    return new Promise(function (resolve, reject) {
      try {
        zlib.unzip(
          Buffer.from(querystring.parse('gzipped=' + gZippedJson).gzipped, 'base64'),
          function (zLibError, zLibBuffer) {
            if (!zLibError) {
              resolve(JSON.parse(zLibBuffer.toString()))
            } else {
              reject(new Error(zLibError))
            }
          })
      } catch (err) {
        reject(new Error(err))
      }
    })
  },

  unZipFile: function (gZippedFilePath, unZippedDestinationFilePath) {
    return new Promise(function (resolve, reject) {
      try {
        resolve(unZippedDestinationFilePath)
      } catch (err) {
        reject(new Error(err))
      }
    })
  }

}
