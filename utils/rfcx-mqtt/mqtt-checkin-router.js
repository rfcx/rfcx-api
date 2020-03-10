var Promise = require("bluebird");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;
var checkInDatabase = require("../../utils/rfcx-mqtt/mqtt-database.js").checkInDatabase;
var checkInAssets = require("../../utils/rfcx-mqtt/mqtt-checkin-assets.js").checkInAssets;
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;
var checkInHelpers = require("../../utils/rfcx-checkin");
var loggers = require('../../utils/logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;
var SensationsService = require('../../services/sensations/sensations-service')

function onMessageCheckin(data, messageId) {
  logDebug('mqttCheckInRouter => onMessageCheckin', data);
  // cached file garbage collection... only do garbage collection ~1% of the time
  if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

  return mqttInputData.parseCheckInInput(data)
    .then((checkInObj) => {
      checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
      logDebug('mqttCheckInRouter -> onMessageCheckin -> parseCheckInInput', {
        messageId,
        checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
        checkInObjJson: JSON.parse(JSON.stringify(checkInObj.json)),
      });
      return checkInDatabase.getDbGuardian(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> getDbGuardian', {
        messageId,
        checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
        guardian: checkInObj.db.dbGuardian.guid,
        site_id: checkInObj.db.dbGuardian.site_id,
      });
      return checkInDatabase.getDbSite(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> getDbSite', {
        messageId,
        checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
        site: checkInObj.db.dbSite.guid,
      });
      return checkInAssets.extractAudioFileMeta(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> extractAudioFileMeta', {
        messageId,
        checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
        audioMeta: JSON.parse(JSON.stringify(checkInObj.audio.meta)),
      });
      return checkInDatabase.setGuardianCoordinates(checkInObj)
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> setGuardianCoordinates', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.createDbCheckIn(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbCheckIn', {
        messageId,
        checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
        checkInGuid: checkInObj.db.dbCheckIn.guid,
      });
      return checkInDatabase.saveDbMessages(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> saveDbMessages', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.createDbSaveMeta(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbSaveMeta', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.updateDbMetaAssetsExchangeLog(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> updateDbMetaAssetsExchangeLog', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.createDbAudio(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbAudio', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.createDbScreenShot(checkInObj)
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbScreenShot', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.createDbLogFile(checkInObj)
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      if (checkInObj && checkInObj.db && checkInObj.db.dbAudio && checkInObj.audio
            && checkInObj.audio.meta && checkInObj.db.dbGuardian) {
        let audioInfo = {
          audio_guid: checkInObj.db.dbAudio.guid,
          audio_id: checkInObj.db.dbAudio.id,
          api_url_domain: `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}`,
          audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
          audio_s3_path: checkInObj.audio.meta.s3Path,
          s3Path: checkInObj.audio.meta.s3Path,
          audio_sha1_checksum: checkInObj.audio.meta.sha1CheckSum,
          dbAudioObj: checkInObj.db.dbAudio,
        };
        // return checkInHelpers.audio.queueForTaggingByActiveModels(audioInfo)
        //   .then(() => {
            if (process.env.PREDICTION_SERVICE_ENABLED === 'true') {
              return checkInHelpers.audio.queueForTaggingByActiveV3Models(audioInfo, checkInObj.db.dbGuardian)
                .then(() => {
                  return Promise.resolve(checkInObj);
                })
            }
            else {
              return Promise.resolve(checkInObj);
            }
          // });
      }
      else {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile: Cannot send SNS message. Data is invalid', {});
        return Promise.resolve(checkInObj);
      }
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> queueForTaggingByActiveModels', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return checkInDatabase.finalizeCheckIn(checkInObj);
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> finalizeCheckIn', { messageId,checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
      return SensationsService.createSensationsFromGuardianAudio(checkInObj.db.dbAudio.guid)
        .then(() => {
          return Promise.resolve(checkInObj);
        })
    })
    .then((checkInObj) => {
      logDebug('mqttCheckInRouter -> onMessageCheckin -> createSensationsFromGuardianAudio', { messageId });
      return mqttPublish.processAndCompressPublishJson(checkInObj);
    })
    .then((checkInObj) => {
      return { guardian_guid: checkInObj.json.guardian_guid, gzip: checkInObj.rtrn.gzip };
    });
}

exports.mqttCheckInRouter = {
  onMessageCheckin,
};


