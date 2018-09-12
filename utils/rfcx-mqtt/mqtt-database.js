var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var fs = require("fs");
var sequelize = require("sequelize");
var saveMeta = require("../../utils/rfcx-mqtt/mqtt-save-meta.js").saveMeta;
var smsMessages = require("../../utils/rfcx-mqtt/mqtt-sms.js").messages;
var Promise = require('bluebird');
var loggers = require('../../utils/logger');


exports.checkInDatabase = {

  getDbGuardian: function(checkInObj) {

    return models.Guardian
      .findOne({
        where: { guid: checkInObj.json.guardian_guid },
        include: [ { all: true } ]
      })
      .then((dbGuardian) => {
        if (!dbGuardian) {
          return Promise.reject(`Couldn't find guardian with guid ${checkInObj.json.guardian_guid}`);
        }
        checkInObj.db.dbGuardian = dbGuardian;
        return checkInObj;
      });

  },

  createDbCheckIn: function(checkInObj) {

    let opts;
    try {
      let checkInStatArray = strArrToJSArr(checkInObj.json.checkins,"|","*");
      for (vInd in checkInStatArray) {
        checkInObj.json[checkInStatArray[vInd][0]+"_checkins"] = checkInStatArray[vInd][1];
      }

      opts = {
        guardian_id: checkInObj.db.dbGuardian.id,
        site_id: checkInObj.db.dbGuardian.site_id,
        measured_at: new Date(parseInt(checkInObj.json.measured_at)),
        queued_at: new Date(parseInt(checkInObj.json.queued_at)),
        guardian_queued_checkins: parseInt(checkInObj.json.queued_checkins),
        guardian_skipped_checkins: parseInt(checkInObj.json.skipped_checkins),
        guardian_stashed_checkins: parseInt(checkInObj.json.stashed_checkins),
        is_certified: checkInObj.db.dbGuardian.is_certified
      };
    } catch (e) {
      return Promise.reject(e);
    }

    return models.GuardianCheckIn
      .create(opts)
      .then((dbCheckIn) => {
        checkInObj.db.dbCheckIn = dbCheckIn;
        checkInObj.rtrn.obj.checkin_id = dbCheckIn.guid;
        return checkInObj;
      });

  },

  saveDbMessages: function(checkInObj) {

    let msgs = [],
        msgInfo,
        proms = [];
    try {
      msgInfo = smsMessages.info(
        checkInObj.json.messages, checkInObj.db.dbGuardian.id,
        checkInObj.db.dbCheckIn.id, checkInObj.json.timezone_offset
      );
    } catch (e) {
      return Promise.reject(e);
    }

    for (msgInfoInd in msgInfo) {
      msgs.push({ id: msgInfo[msgInfoInd].android_id });
      proms.push(smsMessages.save(msgInfo[msgInfoInd]));
    }
    return Promise.all(proms)
      .then(() => {
        return msgs;
      });

  },

  createDbSaveMeta: function(checkInObj) {

    let guardianId = checkInObj.db.dbGuardian.id,
        checkInId  = checkInObj.db.dbCheckIn.id;

    let proms = [
      saveMeta.DataTransfer(strArrToJSArr(checkInObj.json.data_transfer,"|","*"), guardianId, checkInId),
      saveMeta.CPU(strArrToJSArr(checkInObj.json.cpu,"|","*"), guardianId, checkInId),
      saveMeta.Battery(strArrToJSArr(checkInObj.json.battery,"|","*"), guardianId, checkInId),
      saveMeta.Power(strArrToJSArr(checkInObj.json.power,"|","*"), guardianId, checkInId),
      saveMeta.Network(strArrToJSArr(checkInObj.json.network,"|","*"), guardianId, checkInId),
      saveMeta.Offline(strArrToJSArr(checkInObj.json.offline,"|","*"), guardianId, checkInId),
      saveMeta.LightMeter(strArrToJSArr(checkInObj.json.lightmeter,"|","*"), guardianId, checkInId),
      saveMeta.Accelerometer(strArrToJSArr(checkInObj.json.accelerometer,"|","*"), guardianId, checkInId),
      saveMeta.DiskUsage(strArrToJSArr(checkInObj.json.disk_usage,"|","*"), guardianId, checkInId),
      saveMeta.GeoLocation(strArrToJSArr(checkInObj.json.location,"|","*"), guardianId, checkInId),

      saveMeta.RebootEvents(strArrToJSArr(checkInObj.json.reboots,"|","*"), guardianId, checkInId),
      saveMeta.SoftwareRoleVersion(strArrToJSArr(checkInObj.json.software,"|","*"), guardianId),
      saveMeta.PreviousCheckIns(strArrToJSArr(checkInObj.json.previous_checkins,"|","*")),
    ];

    return Promise.all(proms);

  },

  createDbAudio: function(checkInObj) {

    let dbAudioLocal;

    return models.GuardianAudio.findOrCreate({
      where: {
        sha1_checksum: checkInObj.audio.meta.sha1CheckSum
      },
      defaults: {
        guardian_id: checkInObj.db.dbGuardian.id,
        site_id: checkInObj.db.dbGuardian.site_id,
        check_in_id: checkInObj.db.dbCheckIn.id,
        sha1_checksum: checkInObj.audio.meta.sha1CheckSum,
        url: null,
        capture_bitrate: checkInObj.audio.meta.bitRate,
        encode_duration: checkInObj.audio.meta.encodeDuration,
        measured_at: checkInObj.audio.meta.measuredAt,
        capture_sample_count: checkInObj.audio.meta.captureSampleCount,
        size: checkInObj.audio.meta.size
      }
    })
    .spread(function(dbAudio, wasCreated){
      dbAudioLocal = dbAudio;
      return models.GuardianAudioFormat.findOrCreate({
        where: {
          codec: checkInObj.audio.meta.audioCodec,
          mime: checkInObj.audio.meta.mimeType,
          file_extension: checkInObj.audio.meta.fileExtension,
          sample_rate: checkInObj.audio.meta.sampleRate,
          target_bit_rate: checkInObj.audio.meta.bitRate,
          is_vbr: checkInObj.audio.meta.isVbr
        }
      });
    })
    .spread(function(dbAudioFormat, wasCreated){
      dbAudioLocal.format_id = dbAudioFormat.id;
      return dbAudioLocal.save();
    })
    .then(function(dbAudio) {
      return dbAudio.reload({include: [{ all: true } ]});
    })
    .then(function(dbAudio) {
      checkInObj.db.dbAudio = dbAudio;
      checkInObj.rtrn.obj.audio.push({ id: checkInObj.audio.metaArr[1] });
      return checkInObj;
    });
  },

  createDbScreenShot: function(checkInObj) {

    if (checkInObj.screenshots.filePath === null) {
      return Promise.resolve(checkInObj);
    }

    fs.stat(checkInObj.screenshots.filePath, function(statErr, fileStat) {
      if (!!statErr) {
        return Promise.reject(statErr);
      }

      let defaults = {};
      try {
        defaults = {
          guardian_id: checkInObj.db.dbGuardian.id,
          sha1_checksum: checkInObj.screenshots.metaArr[3],
          url: null,
          captured_at: new Date(parseInt(checkInObj.screenshots.metaArr[1])),
          size: fileStat.size
        }
      } catch(e) {
        return Promise.reject(e);
      }

      return models.GuardianMetaScreenShot.findOrCreate({
        where: {
          sha1_checksum: checkInObj.screenshots.metaArr[3]
        },
        defaults
      })
      .then(function(dbScreenShot) {
        checkInObj.db.dbScreenShot= dbScreenShot;
        checkInObj.rtrn.obj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] });
        return checkInObj;
      });

    });
  },

  createDbLogFile: function(checkInObj) {

    if (checkInObj.logs.filePath === null) {
      return Promise.resolve(checkInObj);
    }

    fs.stat(checkInObj.logs.filePath, (statErr, fileStat) => {
      if (!!statErr) {
        return Promise.reject(statErr);
      }

      let defaults = {};
      try {
        defaults = {
          guardian_id: checkInObj.db.dbGuardian.id,
          sha1_checksum: checkInObj.logs.metaArr[3],
          url: null,
          captured_at: new Date(parseInt(checkInObj.logs.metaArr[1])),
          size: fileStat.size
        };
      } catch(e) {
        return Promise.reject(e);
      }

      return models.GuardianMetaLog.findOrCreate({
        where: {
          sha1_checksum: checkInObj.logs.metaArr[3]
        },
        defaults
      })
      .then(function(dbLogs) {
        checkInObj.db.dbLogs= dbLogs;
        checkInObj.rtrn.obj.logs.push({ id: checkInObj.logs.metaArr[1] });
        return checkInObj;
      });

    });
  },

  finalizeCheckIn: function(checkInObj) {

    checkInObj.db.dbGuardian.last_check_in = new Date();
    checkInObj.db.dbGuardian.check_in_count = 1 + checkInObj.db.dbGuardian.check_in_count;
    checkInObj.db.dbCheckIn.request_latency_api = (new Date()).valueOf() - checkInObj.meta.checkStartTime.valueOf();
    return Promise.all([
      checkInObj.db.dbGuardian.save(),
      checkInObj.db.dbCheckIn.save()
    ])
      .then(() => {
        return Promise.all([
          checkInObj.db.dbGuardian.reload(),
          checkInObj.db.dbCheckIn.reload()
        ])
      });

  }


};

function strArrToJSArr(str,delimA,delimB) {
  if ((str == null) || (str.length == 0)) { return []; }
  try {
    var rtrnArr = [], arr = str.split(delimA);
    if (arr.length > 0) { for (i in arr) { rtrnArr.push(arr[i].split(delimB)); } return rtrnArr; } else { return []; }
  } catch(e) {
    console.log(e); return [];
  }
}
