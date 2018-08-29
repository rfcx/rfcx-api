var Promise = require("bluebird");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var mqttKafka = require('../../utils/rfcx-mqtt/mqtt-kafka');

exports.mqttCheckInRouter = {

  onMessageCheckin: function(data) {

    // cached file garbage collection... only do garbage collection ~1% of the time
    if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

    mqttInputData.parseCheckInInput(data)
      .bind({})
      .then((checkInObj) => {
        checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
        this.checkInObj = checkInObj;
        return checkInDatabase.getDbGuardian(checkInObj);
      })
      .then((checkInObj) => {
        return checkInAssets.extractAudioFileMeta(checkInObj);
      })
      .then((checkInObj) => {
        return checkInDatabase.createDbCheckIn(checkInObj);
      })
      .then((checkInObj) => {
        return checkInDatabase.saveDbMessages(checkInObj);
      })
      .then((savedMsgs) => {
        this.checkInObj.rtrn.obj.messages = savedMsgs;
        return checkInDatabase.createDbSaveMeta(checkInObj);
      })
      .then(() => {
        return checkInDatabase.createDbAudio(this.checkInObj);
      })
      .then((checkInObj) => {
        return checkInDatabase.createDbScreenShot(checkInObj)
      })
      .then((checkInObj) => {
        return checkInDatabase.createDbLogFile(checkInObj)
      })
      .then((checkInObj) => {
        return checkInDatabase.finalizeCheckIn(checkInObj);
      })
      .then(() => {
        return mqttPublish.processAndCompressPublishJson(checkInObj)
      })
      .then(() => {
        let kafObj = mqttKafka.prepareKafkaObject(checkInObj, checkInObj.db.dbGuardian, checkInObj.db.dbAudio);
        return kafka.preparePayloadItem('Sensation', JSON.stringify(kafObj))
                    .then(kafka.send);
      })
  }

};


