var mqttPingProcess = require('../../utils/rfcx-mqtt/mqtt-ping-process.js').mqttPingProcess
var checkInDatabase = require('../../utils/rfcx-mqtt/mqtt-database.js').checkInDatabase
var mqttInstructions = require('../../utils/rfcx-mqtt/mqtt-instructions.js').mqttInstructions
var guardianCommand = require('../../utils/rfcx-mqtt/guardian-command-publish.js').guardianCommand

function onMessagePing (data, messageId) {
  return mqttPingProcess.parsePingInput(data)
    .then((pingObj) => {
      pingObj.rtrn = {
        obj: {
          audio: [],
          screenshots: [],
          logs: [],
          messages: [],
          meta: [],
          photos: [],
          videos: [],
          purged: [],
          received: [],
          unconfirmed: [],
          prefs: [],
          instructions: []
        }
      }
      return checkInDatabase.getDbGuardian(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.validateDbGuardianToken(pingObj)
    })
    .then((pingObj) => {
      return checkInDatabase.createDbSaveMeta(pingObj)
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

exports.mqttPingRouter = {
  onMessagePing
}
