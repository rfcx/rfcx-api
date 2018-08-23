var Promise = require("bluebird");
var zlib = require("zlib");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;

function onMessageCheckin(topic, data) {

  return new Promise((resolve, reject) => {
    if (topic === "guardians/checkins") {

      // cached file garbage collection... only do garbage collection ~1% of the time
      if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

      return mqttInputData.parseCheckInInput(data)
        .bind(this)
        .then((checkInObj) => {

          checkInObj.rtrn = {
            obj: {
              checkin_id: null,
              audio: [],
              screenshots: [],
              logs: [],
              messages: [],
              instructions: {
                messages: []
              }
            }
          };

          this.checkInObj = checkInObj;

          return checkInDatabase.getDbGuardian(this.checkInObj)
        })
        .then(() => {
          return checkInAssets.extractAudioFileMeta(this.checkInObj)
        })
        .then(() => {
          return checkInDatabase.createDbCheckIn(this.checkInObj);
        })
        .then(() => {
          return checkInDatabase.saveDbMessages(this.checkInObj);
        })
        .then((savedMsgs) => {
          this.checkInObj.rtrn.obj.messages = savedMsgs;
          checkInDatabase.createDbSaveMeta(this.checkInObj);
          return true;
        })
        .then(() => {
          return checkInDatabase.createDbAudio(this.checkInObj)
        })
        .then(() => {
          return checkInDatabase.createDbScreenShot(this.checkInObj)
        })
        .then(() => {
          return checkInDatabase.createDbLogFile(this.checkInObj);
        })
        .then(() => {
          return checkInDatabase.finalizeCheckIn(this.checkInObj);
        })
        .then(() => {
          return processAndCompressReturnJson(this.checkInObj);
        })
        .catch((err) => {

        })

    } else {
      reject(new Error('Wrong topic name'));
    }
  }).bind(this);
}

function processAndCompressReturnJson(checkInObj) {
  return new Promise(function(resolve,reject){

    zlib.gzip( new Buffer(JSON.stringify(checkInObj.rtrn.obj), "utf8"), function(errJsonGzip, bufJsonGzip) {
      if (errJsonGzip) {
        console.log(errJsonGzip);
        reject(errJsonGzip);
      }
      else {
        checkInObj.rtrn.gzip = bufJsonGzip;
        resolve(checkInObj);
      }
    });

  }.bind(this));
};

exports.mqttRouter = {
  onMessageCheckin,
}
