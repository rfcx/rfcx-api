var mqttPingProcess = require('../../utils/rfcx-mqtt/mqtt-ping-process.js').mqttPingProcess
var checkInDatabase = require('../../utils/rfcx-mqtt/mqtt-database.js').checkInDatabase
var mqttInstructions = require('../../utils/rfcx-mqtt/mqtt-instructions.js').mqttInstructions
var guardianCommand = require('../../utils/rfcx-guardian/guardian-command-publish.js').guardianCommand

function onMessagePing (pingObj, messageId) {
  return checkInDatabase.getDbGuardian(pingObj)
    .then((pingObj) => {
      return checkInDatabase.validateDbGuardianToken(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.getDbSite(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.createDbSaveMeta(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.saveDbMessages(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.updateDbMetaAssetsExchangeLog(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.syncGuardianPrefs(pingObj)
    })
    .then((pingObj) => {
      return mqttInstructions.updateReceivedGuardianInstructions(pingObj)
    })
    .then((pingObj) => {
      return mqttInstructions.updateExecutedGuardianInstructions(pingObj)
    })
    .then((pingObj) => {
      return mqttInstructions.updateAndDispatchGuardianInstructions(pingObj)
    })
    .then((pingObj) => {
      return guardianCommand.processAndCompressCommandJson(pingObj)
    })
    .then((pingObj) => {
      return { guardian_guid: pingObj.json.guardian.guid, obj: pingObj.rtrn.obj, gzip: pingObj.rtrn.gzip }
    })
}

function onMqttMessagePing (data, messageId) {
  return mqttPingProcess.parsePingInput(data)
    .then((pingObj) => {
      return onMessagePing(pingObj, messageId)
    })
}

exports.pingRouter = {
  onMqttMessagePing,
  onMessagePing
}