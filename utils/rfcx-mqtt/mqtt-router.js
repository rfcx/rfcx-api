var Promise = require("bluebird");
var zlib = require("zlib");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAudio = require("../../utils/rfcx-mqtt/mqtt-checkin-audio.js").audio;

exports.mqttRouter = {

  onMessageCheckin: function(topic, data) {

    return new Promise(function(resolve,reject){
      if (topic == "guardians/checkins") {
        try {

          // cached file garbage collection... only do garbage collection ~1% of the time
          if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

          
          mqttInputData.parseCheckInInput(data).then(function(checkInObj){
            checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [], instructions: { messages: [] } } };
            checkInDatabase.getDbGuardian(checkInObj).then(function(checkInObj){  


              checkInAudio.extractAudioFileMeta(checkInObj).then(function(checkInObj){

                checkInDatabase.createDbCheckIn(checkInObj).then(function(checkInObj){
                  checkInDatabase.saveDbMessages(checkInObj).then(function(savedMsgs){
                    checkInObj.rtrn.obj.messages = savedMsgs;
                    checkInDatabase.createDbSaveMeta(checkInObj);








                    if (checkInObj.audio.filePath != null) { checkInObj.rtrn.obj.audio.push({ id: checkInObj.audio.metaArr[1] }); }
                    if (checkInObj.screenshots.filePath != null) { checkInObj.rtrn.obj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] }); }
                    if (checkInObj.logs.filePath != null) { checkInObj.rtrn.obj.logs.push({ id: checkInObj.logs.metaArr[1] }); }
                    if (checkInObj.db.dbCheckIn.guid != null) { checkInObj.rtrn.obj.checkin_id = checkInObj.db.dbCheckIn.guid; }

                    zlib.gzip( new Buffer(JSON.stringify(checkInObj.rtrn.obj), "utf8"), function(errJsonGzip, bufJsonGzip) {
                      if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
                        checkInObj.rtrn.gzip = bufJsonGzip;
                        console.log(JSON.stringify(checkInObj.rtrn.obj));
                        resolve(checkInObj);
                      }
                    });




                  }).catch(function(errSaveSms){ console.log(errSaveSms); reject(new Error(errSaveSms)); });
                }).catch(function(errCreateDbCheckIn){ console.log(errCreateDbCheckIn); reject(new Error(errCreateDbCheckIn)); });
              }).catch(function(errAudioMetaExtraction){ console.log(errAudioMetaExtraction); reject(new Error(errAudioMetaExtraction)); });
            }).catch(function(errGetDbGuardian){ console.log(errGetDbGuardian); reject(new Error(errGetDbGuardian)); });
          }).catch(function(errParseCheckInInput){ console.log(errParseCheckInInput); reject(new Error(errParseCheckInInput)); });
        } catch (errOnMessageCheckin) { console.log(errOnMessageCheckin); reject(new Error(errOnMessageCheckin)); }
      } else {
        reject(new Error());
      }
    });

  }
  
};
