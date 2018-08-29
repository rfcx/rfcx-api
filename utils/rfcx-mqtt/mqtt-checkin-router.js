var Promise = require("bluebird");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var mqttKafka = require('../../utils/rfcx-mqtt/mqtt-kafka');
var loggers = require('../../utils/logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

exports.mqttCheckInRouter = {

   onMessageCheckin: (data) => {

    logDebug('mqttCheckInRouter => onMessageCheckin', data);
    // cached file garbage collection... only do garbage collection ~1% of the time
    if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

    mqttInputData.parseCheckInInput(data)
      .bind({})
      .then((checkInObj) => {
        checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
        this.checkInObj = checkInObj;
        logDebug('mqttCheckInRouter -> onMessageCheckin -> parseCheckInInput', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.getDbGuardian(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> getDbGuardian', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInAssets.extractAudioFileMeta(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> extractAudioFileMeta', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.createDbCheckIn(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbCheckIn', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.saveDbMessages(checkInObj);
      })
      .then((savedMsgs) => {
        this.checkInObj.rtrn.obj.messages = savedMsgs;
        logDebug('mqttCheckInRouter -> onMessageCheckin -> saveDbMessages', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.createDbSaveMeta(checkInObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbSaveMeta', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.createDbAudio(this.checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbAudio', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.createDbScreenShot(checkInObj)
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbScreenShot', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.createDbLogFile(checkInObj)
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return checkInDatabase.finalizeCheckIn(checkInObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> finalizeCheckIn', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        return mqttPublish.processAndCompressPublishJson(checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> processAndCompressPublishJson', { checkInObj: JSON.parse(JSON.stringify(checkInObj))});
        let kafObj = mqttKafka.prepareKafkaObject(checkInObj, checkInObj.db.dbGuardian, checkInObj.db.dbAudio);
        logDebug('mqttCheckInRouter -> onMessageCheckin Kafka object', { kafObj: kafObj });
        return kafka.preparePayloadItem('Sensation', JSON.stringify(kafObj))
                    .then(kafka.send);
      })
  }

};


