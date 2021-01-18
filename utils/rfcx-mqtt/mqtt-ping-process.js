var zlib = require('zlib')
var Promise = require('bluebird')
var msgParseUtils = require('../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils

exports.mqttPingProcess = {

  parsePingInput: function (mqttData) {
    return new Promise(function (resolve, reject) {
      try {
        var metaLength = 12
        var jsonBlobLength = parseInt(mqttData.toString('utf8', 0, metaLength))

        zlib.gunzip(mqttData.slice(metaLength, metaLength + jsonBlobLength), function (jsonError, jsonBuffer) {
          if (jsonError) {
            reject(jsonError)
          }
          
          console.log(jsonBuffer.toString('utf8'));

          try {
            var pingObj = msgParseUtils.constructGuardianMsgObj(JSON.parse(jsonBuffer.toString('utf8')), null, null);
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
