var Promise = require("bluebird");
var zlib = require("zlib");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;

exports.mqttRouter = {

  onMessageCheckin: function(topic, data) {

    return new Promise(function(resolve,reject){

      if (topic == "guardians/checkins") {

        try {

          // cached file garbage collection... only do garbage collection ~1% of the time
          if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }
          
          mqttInputData.parseCheckInInput(data).then(function(checkInObj){
            
            checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
            
            checkInDatabase.getDbGuardian(checkInObj).then(function(checkInObj){  
              checkInAssets.extractAudioFileMeta(checkInObj).then(function(checkInObj){

                checkInDatabase.createDbCheckIn(checkInObj).then(function(checkInObj){
                  checkInDatabase.saveDbMessages(checkInObj).then(function(savedMsgs){
                    checkInObj.rtrn.obj.messages = savedMsgs;
                    checkInDatabase.createDbSaveMeta(checkInObj);

                    checkInDatabase.createDbAudio(checkInObj).then(function(checkInObj){
                      checkInDatabase.createDbScreenShot(checkInObj).then(function(checkInObj){
                        checkInDatabase.createDbLogFile(checkInObj).then(function(checkInObj){

                          checkInDatabase.finalizeCheckIn(checkInObj);

                          mqttPublish.processAndCompressPublishJson(checkInObj).then(function(checkInObj){

                            resolve(checkInObj);

                          }).catch(function(errProcessReturnJson){ console.log(errProcessReturnJson); reject(new Error(errProcessReturnJson)); });

                        }).catch(function(errSaveDbLogs){ console.log(errSaveDbLogs); reject(new Error(errSaveDbLogs)); });
                      }).catch(function(errSaveDbScreenShot){ console.log(errSaveDbScreenShot); reject(new Error(errSaveDbScreenShot)); });
                    }).catch(function(errSaveDbAudio){ console.log(errSaveDbAudio); reject(new Error(errSaveDbAudio)); });
                  }).catch(function(errSaveSms){ console.log(errSaveSms); reject(new Error(errSaveSms)); });
                }).catch(function(errCreateDbCheckIn){ console.log(errCreateDbCheckIn); reject(new Error(errCreateDbCheckIn)); });
              }).catch(function(errAudioMetaExtraction){ console.log(errAudioMetaExtraction); reject(new Error(errAudioMetaExtraction)); });
            }).catch(function(errGetDbGuardian){ console.log(errGetDbGuardian); reject(new Error(errGetDbGuardian)); });
          }).catch(function(errParseCheckInInput){ console.log(errParseCheckInInput); reject(new Error(errParseCheckInInput)); });

        } catch (errOnMessageCheckin) { console.log(errOnMessageCheckin); reject(new Error(errOnMessageCheckin)); }
      
      } else {
        reject(new Error());
      }
    }.bind(this));
  }
  
};


