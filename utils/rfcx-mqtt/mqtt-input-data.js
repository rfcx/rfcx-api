var verbose_logging = (process.env.NODE_ENV !== "production");
var fs = require("fs");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
var Promise = require('bluebird');
var loggers = require('../../utils/logger');

exports.mqttInputData = {

  parseCheckInInput: function(mqttData) {

    return new Promise(function(resolve, reject) {

      try {

        var metaLength = 12;
        var jsonBlobLength = parseInt(mqttData.toString("utf8", 0, metaLength));
        var audioFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength, metaLength+jsonBlobLength+metaLength));
        var screenShotFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength));
        var logFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength));
        var photoFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength+metaLength));
        var videoFileLength = parseInt(mqttData.toString("utf8", metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength+metaLength+photoFileLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength+metaLength+photoFileLength+metaLength));

        var audioFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength);
        var screenShotFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength);
        var logFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength);
        var photoFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileBuffer+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength+metaLength+photoFileLength);
        var videoFileBuffer = mqttData.slice(metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileBuffer+metaLength+photoFileBuffer+metaLength, metaLength+jsonBlobLength+metaLength+audioFileLength+metaLength+screenShotFileLength+metaLength+logFileLength+metaLength+photoFileLength+metaLength+videoFileLength);

        var checkInObj = { json: {}, meta: {}, db: {}, audio: {}, screenshots: {}, logs: {}, photos: {}, videos: {} };

        checkInObj.meta.checkStartTime = new Date();

        zlib.gunzip(mqttData.slice(metaLength, metaLength+jsonBlobLength), function(jsonError, jsonBuffer) {

          if (jsonError) {
            reject(jsonError);
          }

          checkInObj.json = JSON.parse(jsonBuffer.toString("utf8"));

          checkInObj.audio.metaArr = (strArrToJSArr(checkInObj.json.audio,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.audio,"|","*")[0];
          cacheFileBufferToFile(audioFileBuffer, true, checkInObj.audio.metaArr[3], checkInObj.audio.metaArr[2])
            .then(function(audioFileCacheFilePath) {
                checkInObj.audio.filePath = audioFileCacheFilePath;
                return saveAssetFileToS3("audio", checkInObj);
            })
            .then(function(checkInObj) {
              checkInObj.screenshots.metaArr = (strArrToJSArr(checkInObj.json.screenshots,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.screenshots,"|","*")[0];
              return cacheFileBufferToFile(screenShotFileBuffer, false, checkInObj.screenshots.metaArr[3], checkInObj.audio.metaArr[2])
            })
            .then(function(screenShotCacheFilePath) {
              checkInObj.screenshots.filePath = screenShotCacheFilePath;
              return saveAssetFileToS3("screenshots", checkInObj);
            })
            .then(function(checkInObj) {
              checkInObj.logs.metaArr = (strArrToJSArr(checkInObj.json.logs,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.logs,"|","*")[0];
              return cacheFileBufferToFile(logFileBuffer, true, checkInObj.logs.metaArr[3], checkInObj.audio.metaArr[2]);
            })
            .then(function(logFileCacheFilePath) {
              checkInObj.logs.filePath = logFileCacheFilePath;
              return saveAssetFileToS3("logs", checkInObj);
            })
            .then(function(checkInObj) {
              checkInObj.photos.metaArr = (strArrToJSArr(checkInObj.json.photos,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.photos,"|","*")[0];
              return cacheFileBufferToFile(photoFileBuffer, true, checkInObj.photos.metaArr[3], checkInObj.audio.metaArr[2])
            })
            .then(function(photoCacheFilePath) {
              checkInObj.photos.filePath = photoCacheFilePath;
              return saveAssetFileToS3("photos", checkInObj);
            })
            .then(function(checkInObj) {
              checkInObj.videos.metaArr = (strArrToJSArr(checkInObj.json.videos,"|","*").length == 0) ? [] : strArrToJSArr(checkInObj.json.videos,"|","*")[0];
              return cacheFileBufferToFile(videoFileBuffer, true, checkInObj.videos.metaArr[3], checkInObj.audio.metaArr[2])
            })
            .then(function(videoCacheFilePath) {
              checkInObj.videos.filePath = videoCacheFilePath;
              return saveAssetFileToS3("videos", checkInObj);
            })
            .then(function(checkInObj) {
              resolve(checkInObj);
            })
            .catch((err) => {
              reject(err);
            })
        });
      } catch (errParsecheckInObj) {
        console.log(errParsecheckInObj);
        reject(errParsecheckInObj);
      }
    }.bind(this));
  }

};


var saveAssetFileToS3 = function(assetType, checkInObj) {
  return new Promise(function(resolve, reject) {

      try {

        if (checkInObj[assetType].filePath == null) {

          resolve(checkInObj);

        } else {

          var s3Path = assetUtils.getGuardianAssetStoragePath( assetType, new Date(parseInt(checkInObj[assetType].metaArr[1])), checkInObj.json.guardian_guid, checkInObj[assetType].metaArr[2]);
          var s3Bucket = (assetType == "audio") ? process.env.ASSET_BUCKET_AUDIO : process.env.ASSET_BUCKET_META;

          aws.s3(s3Bucket).putFile(checkInObj[assetType].filePath, s3Path, function(s3SaveErr, s3Res){
            try { s3Res.resume(); } catch (resumeErr) { console.log(resumeErr); }

            if (!!s3SaveErr) {
                console.log(s3SaveErr);
                reject(new Error(s3SaveErr));
            } else if ( (200 == s3Res.statusCode) && aws.s3ConfirmSave(s3Res, s3Path) ) {
              resolve(checkInObj);
            } else {
              reject(new Error("asset file ("+assetType+") could not be saved to s3"));
            }
          });
        }

      } catch (errSaveAssetToS3) { console.log(errSaveAssetToS3); reject(new Error(errSaveAssetToS3)); }
  });
};


var cacheFileBufferToFile = function(fileBuffer, isGZipped, fileSha1Hash, fileExtension) {
    return new Promise(function(resolve, reject) {
      try {
        if (fileBuffer.length == 0) {
          resolve(null);
        } else {

          var tmpFilePath = process.env.CACHE_DIRECTORY+"uploads/"+hash.randomString(36)+"."+fileExtension+(isGZipped ? ".gz" : "");

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
                    var tmpFilePathUnZipped = process.env.CACHE_DIRECTORY+"uploads/"+hash.randomString(36)+"."+fileExtension;
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


