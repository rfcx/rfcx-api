const Promise = require('bluebird')
const cachedFiles = require('../../utils/internal-rfcx/cached-files.js').cachedFiles
const mqttInputData = require('../../utils/rfcx-mqtt/mqtt-input-data.js').mqttInputData
const checkInDatabase = require('../../utils/rfcx-mqtt/mqtt-database.js').checkInDatabase
const checkInAssets = require('../../utils/rfcx-mqtt/mqtt-checkin-assets.js').checkInAssets
const mqttInstructions = require('../../utils/rfcx-mqtt/mqtt-instructions.js').mqttInstructions
const guardianCommand = require('../../utils/rfcx-guardian/guardian-command-publish.js').guardianCommand
const mqttStreams = require('../../utils/rfcx-mqtt/mqtt-streams')
const queueForPrediction = require('../../utils/rfcx-analysis/queue-for-prediction')
const SensationsService = require('../../services/legacy/sensations/sensations-service')
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
      if (checkInObj && checkInObj.db && checkInObj.db.dbAudio && checkInObj.audio &&
            checkInObj.audio.meta && checkInObj.db.dbGuardian) {
        const audioInfo = {
          audio_guid: checkInObj.db.dbAudio.guid,
          audio_id: checkInObj.db.dbAudio.id,
          api_url_domain: `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}`,
          audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
          audio_s3_path: checkInObj.audio.meta.s3Path,
          s3Path: checkInObj.audio.meta.s3Path,
          audio_sha1_checksum: checkInObj.audio.meta.sha1CheckSum,
          dbAudioObj: checkInObj.db.dbAudio
        }
        return queueForPrediction(audioInfo, checkInObj.db.dbGuardian).then(() => checkInObj)
      } else {
        return Promise.resolve(checkInObj)
      }
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
