var Promise = require("bluebird");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var checkInHelpers = require("../../utils/rfcx-checkin");
var loggers = require('../../utils/logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

exports.mqttCheckInRouter = {

   onMessageCheckin: (data) => {

    logDebug('mqttCheckInRouter => onMessageCheckin', data);
    // cached file garbage collection... only do garbage collection ~1% of the time
    if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

    return mqttInputData.parseCheckInInput(data)
      .bind({})
      .then((checkInObj) => {
        checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
        this.checkInObj = checkInObj;
        logDebug('mqttCheckInRouter -> onMessageCheckin -> parseCheckInInput', {
          checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
          checkInObjJson: JSON.parse(JSON.stringify(checkInObj.json)),
        });
        return checkInDatabase.getDbGuardian(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> getDbGuardian', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInAssets.extractAudioFileMeta(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> extractAudioFileMeta', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.setGuardianCoordinates(checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> setGuardianCoordinates', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return checkInDatabase.createDbCheckIn(this.checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbCheckIn', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.saveDbMessages(checkInObj);
      })
      .then((savedMsgs) => {
        this.checkInObj.rtrn.obj.messages = savedMsgs;
        logDebug('mqttCheckInRouter -> onMessageCheckin -> saveDbMessages', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return checkInDatabase.createDbSaveMeta(this.checkInObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbSaveMeta', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return checkInDatabase.createDbAudio(this.checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbAudio', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.createDbScreenShot(checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbScreenShot', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return checkInDatabase.createDbLogFile(this.checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        let audioInfo = {
          audio_guid: this.checkInObj.db.dbAudio.guid,
          audio_id: this.checkInObj.db.dbAudio.id,
          api_url_domain: `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}`,
          audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
          audio_s3_path: this.checkInObj.audio.meta.s3Path,
          s3Path: this.checkInObj.audio.meta.s3Path,
          audio_sha1_checksum: this.checkInObj.audio.meta.sha1CheckSum,
        };
        logDebug('mqttCheckInRouter -> onMessageCheckin -> queueForTaggingByActiveModels:audioInfo', { audioInfo });
        return checkInHelpers.audio.queueForTaggingByActiveModels(audioInfo);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> queueForTaggingByActiveModels', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return checkInDatabase.finalizeCheckIn(this.checkInObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> finalizeCheckIn', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return mqttPublish.processAndCompressPublishJson(this.checkInObj)
      });
  }

};


