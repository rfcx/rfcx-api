var verbose_logging = (process.env.NODE_ENV !== "production");
// var models  = require("../../models");
var fs = require("fs");
var zlib = require("zlib");
// var util = require("util");
var hash = require("../../utils/misc/hash.js").hash;
// var token = require("../../utils/internal-rfcx/token.js").token;
// var aws = require("../../utils/external/aws.js").aws();
// var checkInHelpers = require("../../utils/rfcx-checkin");
var Promise = require('bluebird');
var loggers = require('../../utils/logger');
// var urls = require('../../utils/misc/urls');
// var sequelize = require("sequelize");
// const moment = require("moment-timezone");

// var logDebug = loggers.debugLogger.log;


exports.mqttInputData = {

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

          var checkInObj = { json: {}, meta: {}, audio: {}, screenshots: {}, logs: {} };

          zlib.gunzip(mqttData.slice(metaLength, metaLength+jsonBlobLength), function(jsonError, jsonBuffer) {
           
            checkInObj.json = JSON.parse(jsonBuffer.toString("utf8"));

            checkInObj.audio.metaArr = (strArrToJSArr(checkInObj.json.audio,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.audio,"|","*")[0];
            cacheFileBufferToFile(audioFileBuffer, true, checkInObj.audio.metaArr[3]).then(function(audioFileCacheFilePath){
                  
              checkInObj.audio.filePath = audioFileCacheFilePath;

              checkInObj.screenshots.metaArr = (strArrToJSArr(checkInObj.json.screenshots,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.screenshots,"|","*")[0];
              cacheFileBufferToFile(screenShotFileBuffer, false, checkInObj.screenshots.metaArr[3]).then(function(screenShotCacheFilePath){

                checkInObj.screenshots.filePath = screenShotCacheFilePath;

                checkInObj.logs.metaArr = (strArrToJSArr(checkInObj.json.logs,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.logs,"|","*")[0];
                cacheFileBufferToFile(logFileBuffer, true, checkInObj.logs.metaArr[3]).then(function(logFileCacheFilePath){

                  checkInObj.logs.filePath = logFileCacheFilePath;
                
                  resolve(checkInObj);

                }).catch(function(errLogFileCache){ console.log(errLogFileCache); reject(new Error(errLogFileCache)); });
              }).catch(function(errScreenShotCache){ console.log(errScreenShotCache); reject(new Error(errScreenShotCache)); });
            }).catch(function(errAudioFileCache){ console.log(errAudioFileCache); reject(new Error(errAudioFileCache)); });
          });
        } catch (errParsecheckInObj) { console.log(errParsecheckInObj); reject(new Error(errParsecheckInObj)); }
    }.bind(this));
  }

};



var cacheFileBufferToFile = function(fileBuffer, isGZipped, fileSha1Hash) {
    return new Promise(function(resolve, reject) {
      try {
        if (fileBuffer.length == 0) {
          resolve(null);
        } else {

          var tmpFilePath = process.env.CACHE_DIRECTORY+"uploads/"+hash.randomString(36);

          fs.writeFile(tmpFilePath, fileBuffer, "binary", function(errWriteFile) {
            if (errWriteFile) { console.log(errWriteFile); reject(new Error(errWriteFile)); } else {
              try {
                if (!isGZipped) {
                  if ((fileSha1Hash == null) || (fileSha1Hash == hash.fileSha1(tmpFilePath))) {
                    resolve(tmpFilePath);
                  } else {
                    console.log("checksum mismatch: "+tmpFilePath); reject(new Error("checksum mismatch: "+tmpFilePath));
                  }
                } else {
                  try {
                    var tmpFilePathUnZipped = process.env.CACHE_DIRECTORY+"uploads/"+hash.randomString(36);
                    var unZipStream = fs.createWriteStream(tmpFilePathUnZipped);
                    fs.createReadStream(tmpFilePath).pipe(zlib.createGunzip()).pipe(unZipStream);
                    unZipStream.on("close", function(){
                      fs.unlink(tmpFilePath);
                      if ((fileSha1Hash == null) || (fileSha1Hash == hash.fileSha1(tmpFilePathUnZipped))) {
                        resolve(tmpFilePathUnZipped);
                      } else {
                        console.log("checksum mismatch: "+tmpFilePathUnZipped); reject(new Error("checksum mismatch: "+tmpFilePathUnZipped));
                      }
                    });
                  } catch(errFileUnZip) { console.log(errFileUnZip); reject(new Error(errFileUnZip)); }
                }
              } catch(errWriteFileInner) { console.log(errWriteFileInner); reject(new Error(errWriteFileInner)); }
            }
          });
        }
      } catch(errCacheFileBufferToFile) { console.log(errCacheFileBufferToFile); reject(new Error(errCacheFileBufferToFile)); }
    }.bind(this));
  };







// function timeStampToDate(timeStamp, LEGACY_timeZoneOffset) {

//   var asDate = null;

//   // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
//   if ((""+timeStamp).indexOf(":") > -1) {
//     // LEGACY TIMESTAMP FORMAT
//     asDate = new Date(timeStamp.replace(/ /g,"T")+LEGACY_timeZoneOffset);
//   } else if (timeStamp != null) {

//     asDate = new Date(parseInt(timeStamp));

//   }
//   return asDate;
// }

// // Special Functions

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


