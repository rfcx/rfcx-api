var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var fs = require("fs");
var zlib = require("zlib");
var util = require("util");
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var aws = require("../../../utils/external/aws.js").aws();
var checkInHelpers = require("../../../utils/rfcx-checkin");
var Promise = require('bluebird');
var loggers = require('../../../utils/logger');
var urls = require('../../../utils/misc/urls');
var sequelize = require("sequelize");
const moment = require("moment-timezone");

var logDebug = loggers.debugLogger.log;


exports.mqttData = {

  parseCheckInInput: function(mqttData) {
    return new Promise(function(resolve, reject) {
        try {


          var metaLength = 12;
          var jsonBlobLength = parseInt(mqttData.toString("utf8", 0, metaLength));
          var audioFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength, metaLength+jsonBlobLength+metaLength));
          var screenShotFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength));
          var logFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength));

          var audioFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength);
          var screenShotFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength);
          var logFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength);

          var checkInInput = {};

          zlib.gunzip(mqttData.slice(metaLength, metaLength+jsonBlobLength), function(jsonError, jsonBuffer) {
           
            checkInInput.json = JSON.parse(jsonBuffer.toString("utf8"));

            resolve(checkInInput);

          });





        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  }


};












function timeStampToDate(timeStamp, LEGACY_timeZoneOffset) {

  var asDate = null;

  // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
  if ((""+timeStamp).indexOf(":") > -1) {
    // LEGACY TIMESTAMP FORMAT
    asDate = new Date(timeStamp.replace(/ /g,"T")+LEGACY_timeZoneOffset);
  } else if (timeStamp != null) {

    asDate = new Date(parseInt(timeStamp));

  }
  return asDate;
}

// Special Functions

function strArrToJSArr(str,delimA,delimB) {
  if ((str == null) || (str.length == 0)) { return []; }
  try {
    var rtrnArr = [], arr = str.split(delimA);
    if (arr.length > 0) {
      for (i in arr) {
        rtrnArr.push(arr[i].split(delimB));
      }
      return rtrnArr;
    } else {
      return [];
    }
  } catch(e) {
    console.log(e);
    return [];
  }
}


