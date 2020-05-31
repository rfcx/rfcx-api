var Promise = require("bluebird");
var mqttPingProcess = require("../../utils/rfcx-mqtt/mqtt-ping-process.js").mqttPingProcess;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var mqttInstructions = require("../../utils/rfcx-mqtt/mqtt-instructions.js").mqttInstructions;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var loggers = require('../logger');
var logDebug = loggers.debugLogger.log;

function onMessagePing(data, messageId) {
  logDebug('mqttPingRouter => onMessagePing', data);

  return mqttPingProcess.parsePingInput(data)
    .then((pingObj) => {
      pingObj.rtrn = { obj: { audio: [], screenshots: [], logs: [], messages: [], meta: [], photos: [], videos: [],
                              purged: [], received: [], unconfirmed: [], instructions: []
                          } };
      logDebug('mqttPingRouter -> onMessagePing -> parsePingInput', { messageId, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return checkInDatabase.getDbGuardian(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> getDbGuardian', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return checkInDatabase.validateDbGuardianToken(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> validateDbGuardianToken', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return checkInDatabase.createDbSaveMeta(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> createDbSaveMeta', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return mqttInstructions.updateReceivedGuardianInstructions(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> updateReceivedGuardianInstructions', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return mqttInstructions.updateExecutedGuardianInstructions(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> updateExecutedGuardianInstructions', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return mqttInstructions.updateAndDispatchGuardianInstructions(pingObj);
    })
    .then((pingObj) => {
      logDebug('mqttPingRouter -> onMessagePing -> updateAndDispatchGuardianInstructions', { messageId, guardian: pingObj.db.dbGuardian.guid, pingObjJson: JSON.parse(JSON.stringify(pingObj.json)) });
      return mqttPublish.processAndCompressPublishJson(pingObj);
    })
    .then((pingObj) => {
      // console.log(pingObj.rtrn.obj);
      return { guardian_guid: pingObj.json.guardian.guid, obj: pingObj.rtrn.obj, gzip: pingObj.rtrn.gzip };
    });
}

exports.mqttPingRouter = {
  onMessagePing,
};


