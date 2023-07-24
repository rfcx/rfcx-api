const mqttPingProcess = require('../rfcx-mqtt/mqtt-ping-process').mqttPingProcess
const checkInDatabase = require('../rfcx-mqtt/mqtt-database').checkInDatabase
const mqttInstructions = require('../rfcx-mqtt/mqtt-instructions').mqttInstructions
const guardianCommand = require('../rfcx-guardian/guardian-command-publish').guardianCommand
const iotdaProcess = require('../rfcx-mqtt/mqtt-iotda-data-parse')
const { expandAbbreviatedFieldNames } = require('../rfcx-mqtt/expand-abbreviated')

function onMessagePing (pingObj, messageId) {
  const expandedPingObj = expandAbbreviatedFieldNames(pingObj)
  return checkInDatabase.getDbGuardian(expandedPingObj)
    .then((pingObj) => {
      return checkInDatabase.validateDbGuardianToken(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.getDbSite(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.recordPing(pingObj)
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
      iotdaProcess.forward(pingObj)
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
