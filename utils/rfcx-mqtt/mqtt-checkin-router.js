var Promise = require("bluebird");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var mqttKafka = require('../../utils/rfcx-mqtt/mqtt-kafka');
var kafka = require('../../services/kafka/kafka-service');
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
        logDebug('mqttCheckInRouter -> onMessageCheckin -> parseCheckInInput', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.getDbGuardian(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> getDbGuardian', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInAssets.extractAudioFileMeta(checkInObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> extractAudioFileMeta', { checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.createDbCheckIn(checkInObj);
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
        return checkInDatabase.finalizeCheckIn(this.checkInObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> finalizeCheckIn', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        return mqttPublish.processAndCompressPublishJson(this.checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> processAndCompressPublishJson', { checkInObj: JSON.parse(JSON.stringify(this.checkInObj.rtrn))});
        let kafObj = mqttKafka.prepareKafkaObject(this.checkInObj, this.checkInObj.db.dbGuardian, this.checkInObj.db.dbAudio);
        logDebug('mqttCheckInRouter -> onMessageCheckin Kafka object', { kafObj });
        return kafka.preparePayloadItem('Sensation', JSON.stringify(kafObj))
                    .then(kafka.send);
      })
  }

};


