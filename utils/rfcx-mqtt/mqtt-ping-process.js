var verbose_logging = (process.env.NODE_ENV !== "production");
var zlib = require("zlib");
var Promise = require('bluebird');
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
//var saveMeta = require("../../utils/rfcx-mqtt/mqtt-save-meta.js").saveMeta;
var loggers = require('../../utils/logger');

exports.mqttPingProcess = {

  parsePingInput: function(mqttData) {

    return new Promise(function(resolve, reject) {

      try {

        var metaLength = 12;
        var jsonBlobLength = parseInt(mqttData.toString("utf8", 0, metaLength));

        var pingObj = { json: {}, meta: { guardian: {} }, db: {} };

        pingObj.meta.pingStartTime = new Date();

        zlib.gunzip(mqttData.slice(metaLength, metaLength+jsonBlobLength), function(jsonError, jsonBuffer) {

          if (jsonError) {
            reject(jsonError);
          }

          try {
            
            pingObj.json = JSON.parse(jsonBuffer.toString("utf8")).ping;
            resolve(pingObj);

          } catch (errParsePingObj) {
            console.log(errParsePingObj);
            reject(errParsePingObj);
          }
        });
      } catch (errUnZipPingObj) {
        console.log(errUnZipPingObj);
        reject(errUnZipPingObj);
      }
    }.bind(this));
  }

};

