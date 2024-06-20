const cachedFiles = require('../internal-rfcx/cached-files').cachedFiles
const mqttInputData = require('../rfcx-mqtt/mqtt-input-data').mqttInputData
const checkInDatabase = require('../rfcx-mqtt/mqtt-database').checkInDatabase
const checkInAssets = require('../rfcx-mqtt/mqtt-checkin-assets').checkInAssets
const mqttInstructions = require('../rfcx-mqtt/mqtt-instructions').mqttInstructions
const guardianCommand = require('../rfcx-guardian/guardian-command-publish').guardianCommand
const { expandAbbreviatedFieldNames } = require('./expand-abbreviated')

function onMessageCheckin (data, messageId) {
  // cached file garbage collection... only do garbage collection ~1% of the time
  if (Math.random() < 0.01) { cachedFiles.cacheDirectoryGarbageCollection() }

  return mqttInputData.parseCheckInInput(data)
    .then((checkInObj) => {
      const expandedCheckinObj = expandAbbreviatedFieldNames(checkInObj)
      return checkInDatabase.getDbGuardian(expandedCheckinObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.validateDbGuardianToken(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.getDbSite(checkInObj)
    })
    .then((checkInObj) => {
      return checkInAssets.extractAudioFileMeta(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.setGuardianCoordinates(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbCheckIn(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.saveDbMessages(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbSaveMeta(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.updateDbMetaAssetsExchangeLog(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.syncGuardianPrefs(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbAudio(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbScreenShot(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbLogFile(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbMetaPhoto(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.createDbMetaVideo(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.finalizeCheckIn(checkInObj)
    })
    .then((checkInObj) => {
      return mqttInstructions.updateReceivedGuardianInstructions(checkInObj)
    })
    .then((checkInObj) => {
      return mqttInstructions.updateExecutedGuardianInstructions(checkInObj)
    })
    .then((checkInObj) => {
      return mqttInstructions.updateAndDispatchGuardianInstructions(checkInObj)
    })
    .then((checkInObj) => {
      return guardianCommand.processAndCompressCommandJson(checkInObj)
    })
    .then((checkInObj) => {
      return { guardian_guid: checkInObj.json.guardian.guid, obj: checkInObj.rtrn.obj, gzip: checkInObj.rtrn.gzip }
    })
}

exports.mqttCheckInRouter = {
  onMessageCheckin
}
