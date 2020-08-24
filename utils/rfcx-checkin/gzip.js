var Promise = require('bluebird')
var querystring = require('querystring')
var zlib = require('zlib')

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
              if (zLibError) {
                console.log(zLibError)
                reject(new Error(zLibError))
              }
            }
          })
      } catch (err) {
        console.log(err)
        reject(new Error(err))
      }
    })
  },

  unZipFile: function (gZippedFilePath, unZippedDestinationFilePath) {
    return new Promise(function (resolve, reject) {
      try {
        resolve(unZippedDestinationFilePath)
      } catch (err) {
        console.log(err)
        reject(new Error(err))
      }
    })
  }

}
