var Promise = require("bluebird");
var mqttPingProcess = require("../../utils/rfcx-mqtt/mqtt-ping-process.js").mqttPingProcess;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var loggers = require('../logger');
var logDebug = loggers.debugLogger.log;

function onMessagePing(data, messageId) {
  logDebug('mqttPingRouter => onMessagePing', data);

  return mqttPingProcess.parsePingInput(data)
    .then((pingObj) => {
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
      console.log({ guardian: pingObj.db.dbGuardian.guid, json: JSON.parse(JSON.stringify(pingObj.json))});
      return JSON.parse(JSON.stringify(pingObj.json));
    })
}

exports.mqttPingRouter = {
  onMessagePing,
};


