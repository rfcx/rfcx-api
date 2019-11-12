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

exports.mqttCheckInRouter = {

   onMessageCheckin: (rootCheckinObj, data, messageId) => {

    logDebug('mqttCheckInRouter => onMessageCheckin', data);
    // cached file garbage collection... only do garbage collection ~1% of the time
    if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

    return mqttInputData.parseCheckInInput(data)
      .then((checkInObj) => {
        checkInObj.rtrn = { obj: { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [] } };
        rootCheckinObj = checkInObj;
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
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> setGuardianCoordinates', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return checkInDatabase.createDbCheckIn(rootCheckinObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbCheckIn', {
          messageId,
          checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn)),
          checkInGuid: checkInObj.db.dbCheckIn.guid,
        });
        return checkInDatabase.saveDbMessages(checkInObj);
      })
      .then((savedMsgs) => {
        rootCheckinObj.rtrn.obj.messages = savedMsgs;
        logDebug('mqttCheckInRouter -> onMessageCheckin -> saveDbMessages', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return checkInDatabase.createDbSaveMeta(rootCheckinObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbSaveMeta', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return checkInDatabase.createDbAudio(rootCheckinObj);
      })
      .then((checkInObj) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbAudio', { messageId, checkInObj: JSON.parse(JSON.stringify(checkInObj.rtrn))});
        return checkInDatabase.createDbScreenShot(checkInObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbScreenShot', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return checkInDatabase.createDbLogFile(rootCheckinObj)
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        if (rootCheckinObj && rootCheckinObj.db && rootCheckinObj.db.dbAudio && rootCheckinObj.audio
              && rootCheckinObj.audio.meta && rootCheckinObj.db.dbGuardian) {
          let audioInfo = {
            audio_guid: rootCheckinObj.db.dbAudio.guid,
            audio_id: rootCheckinObj.db.dbAudio.id,
            api_url_domain: `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}`,
            audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
            audio_s3_path: rootCheckinObj.audio.meta.s3Path,
            s3Path: rootCheckinObj.audio.meta.s3Path,
            audio_sha1_checksum: rootCheckinObj.audio.meta.sha1CheckSum,
            dbAudioObj: rootCheckinObj.db.dbAudio,
          };
          return checkInHelpers.audio.queueForTaggingByActiveModels(audioInfo)
            .then(() => {
              if (process.env.PREDICTION_SERVICE_ENABLED === 'true') {
                return checkInHelpers.audio.queueForTaggingByActiveV3Models(audioInfo, rootCheckinObj.db.dbGuardian)
              }
              else {
                return true;
              }
            });
        }
        else {
          logDebug('mqttCheckInRouter -> onMessageCheckin -> createDbLogFile: Cannot send SNS message. Data is invalid', {});
        }
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> queueForTaggingByActiveModels', { messageId, checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return checkInDatabase.finalizeCheckIn(rootCheckinObj);
      })
      .then(() => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> finalizeCheckIn', { messageId,checkInObj: JSON.parse(JSON.stringify(rootCheckinObj.rtrn))});
        return SensationsService.createSensationsFromGuardianAudio(rootCheckinObj.db.dbAudio.guid);
      })
      .then((sensations) => {
        logDebug('mqttCheckInRouter -> onMessageCheckin -> createSensationsFromGuardianAudio', { messageId, sensations });
        return mqttPublish.processAndCompressPublishJson(rootCheckinObj)
      })
  }

};


