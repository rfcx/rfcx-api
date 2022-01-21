const zlib = require('zlib')
const Promise = require('bluebird')
const msgSegUtils = require('../rfcx-guardian/guardian-msg-parsing-utils')

exports.mqttPingProcess = {

  parsePingInput: function (mqttData) {
    return new Promise(function (resolve, reject) {
      try {
        const metaLength = 12
        const jsonBlobLength = parseInt(mqttData.toString('utf8', 0, metaLength))

        zlib.gunzip(mqttData.slice(metaLength, metaLength + jsonBlobLength), function (jsonError, jsonBuffer) {
          if (jsonError) {
            reject(jsonError)
          }

          try {
            const pingObj = msgSegUtils.guardianMsgParsingUtils.constructGuardianMsgObj(JSON.parse(jsonBuffer.toString('utf8')), null, null)
            resolve(pingObj)
          } catch (errParsePingObj) {
            console.log(errParsePingObj)
            reject(errParsePingObj)
          }
        })
      } catch (errUnZipPingObj) {
        console.log(errUnZipPingObj)
        reject(errUnZipPingObj)
      }
    })
  }

}
