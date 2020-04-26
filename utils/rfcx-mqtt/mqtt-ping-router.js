var Promise = require("bluebird");
var mqttPingProcess = require("../../utils/rfcx-mqtt/mqtt-ping-process.js").mqttPingProcess;
var loggers = require('../logger');
var logDebug = loggers.debugLogger.log;

function onMessagePing(data, messageId) {
  logDebug('mqttPingRouter => onMessagePing', data);

  return mqttPingProcess.parsePingInput(data)
    .then((pingObj) => {

      logDebug('mqttPingRouter -> onMessagePing -> parsePingInput', {
        messageId,
        pingObjJson: JSON.parse(JSON.stringify(pingObj.json)),
      });
      return { guardian_guid: pingObj.json.guardian_guid };
    })
}

exports.mqttPingRouter = {
  onMessagePing,
};


