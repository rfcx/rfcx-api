const Promise = require('bluebird')
const cachedFiles = require('../../utils/internal-rfcx/cached-files.js').cachedFiles
const mqttInputData = require('../../utils/rfcx-mqtt/mqtt-input-data.js').mqttInputData
const checkInDatabase = require('../../utils/rfcx-mqtt/mqtt-database.js').checkInDatabase
const checkInAssets = require('../../utils/rfcx-mqtt/mqtt-checkin-assets.js').checkInAssets
const mqttInstructions = require('../../utils/rfcx-mqtt/mqtt-instructions.js').mqttInstructions
const guardianCommand = require('../../utils/rfcx-guardian/guardian-command-publish.js').guardianCommand
const mqttStreams = require('../../utils/rfcx-mqtt/mqtt-streams')
const SensationsService = require('../../services/legacy/sensations/sensations-service')

function onMessageCheckin (data, messageId) {
  // cached file garbage collection... only do garbage collection ~1% of the time
  if (Math.random() < 0.01) { cachedFiles.cacheDirectoryGarbageCollection() }

  return mqttInputData.parseCheckInInput(data)
    .then((checkInObj) => {
      return checkInDatabase.getDbGuardian(checkInObj)
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
      if (process.env.INGEST_SERVICE_ENABLED === 'true') {
        return mqttStreams.ingestGuardianAudio(checkInObj)
      }
      return Promise.resolve(checkInObj)
    })
    .then((checkInObj) => {
      return checkInDatabase.finalizeCheckIn(checkInObj)
    })
    .then((checkInObj) => {
      return SensationsService.createSensationsFromGuardianAudio(checkInObj.db.dbAudio.guid)
        .then(() => {
          return Promise.resolve(checkInObj)
        })
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
