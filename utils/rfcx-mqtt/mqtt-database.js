var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var fs = require("fs");
var sequelize = require("sequelize");
var saveMeta = require("../../utils/rfcx-mqtt/mqtt-save-meta.js").saveMeta;
var smsMessages = require("../../utils/rfcx-mqtt/mqtt-sms.js").messages;
var Promise = require('bluebird');
var loggers = require('../../utils/logger');
const moment = require('moment-timezone');

exports.checkInDatabase = {

  getDbSite: function(checkInObj) {

    return models.GuardianSite
      .findOne({
        where: { id: checkInObj.db.dbGuardian.site_id },
        include: [ { all: true } ]
      })
      .then((dbSite) => {
        if (!dbSite) {
          return Promise.reject(`Couldn't find site with id ${checkInObj.db.dbGuardian.site_id}`);
        }
        checkInObj.db.dbSite = dbSite;
        return checkInObj;
      });

  },

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
      checkInObj.json.checkins_to_verify = [];
      for (vInd in checkInStatArray) {
        checkInObj.json[checkInStatArray[vInd][0]+"_checkins"] = checkInStatArray[vInd][1];
        if (checkInStatArray[vInd].length > 2) {
          for (i = 2; i < checkInStatArray[vInd].length; i++) {
            checkInObj.json.checkins_to_verify.push(checkInStatArray[vInd][i]);
          }
        }
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
        checkInObj.json.messages, checkInObj.db.dbGuardian.id, checkInObj.db.dbCheckIn.id
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
      saveMeta.GeoPosition(strArrToJSArr(checkInObj.json.geoposition,"|","*"), guardianId, checkInId),
      saveMeta.DateTimeOffset(strArrToJSArr(checkInObj.json.datetime_offsets,"|","*"), guardianId, checkInId),
      saveMeta.MqttBrokerConnection(strArrToJSArr(checkInObj.json.broker_connections,"|","*"), guardianId, checkInId),

      saveMeta.RebootEvents(strArrToJSArr(checkInObj.json.reboots,"|","*"), guardianId, checkInId),
      saveMeta.SoftwareRoleVersion(strArrToJSArr(checkInObj.json.software,"|","*"), guardianId),
      saveMeta.PreviousCheckIns(strArrToJSArr(checkInObj.json.previous_checkins,"|","*")),

      saveMeta.Hardware({ hardware: checkInObj.json.hardware, phone: checkInObj.json.phone }, guardianId)
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
        measured_at_local: moment.tz(checkInObj.audio.meta.measuredAt, (checkInObj.db.dbSite.timezone || 'UTC')).format('YYYY-MM-DDTHH:mm:ss.SSS'),
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

  setGuardianCoordinates: (checkInObj) => {

    if (!checkInObj.json.geoposition) {
      return Promise.resolve();
    }

    let coordsArr = strArrToJSArr(checkInObj.json.geoposition, '|', '*');
    if (!coordsArr.length) {
      return Promise.resolve();
    }
    // get only last coordinate in array
    let lastCoord = coordsArr[coordsArr.length - 1];
    let latitude = parseFloat(lastCoord[1].split(",")[0]);
    let longitude = parseFloat(lastCoord[1].split(",")[1]);
    let accuracy = parseInt(lastCoord[2].split(",")[0]);

    // do not update coordinates if they were not changed or latitude or longitude are undefined or zero
    // only save coordinates if the accuracy of the measurement is within 50 meters
    if (!!latitude && !!longitude && accuracy <= 50 &&
        (checkInObj.db.dbGuardian.latitude !== latitude) || (checkInObj.db.dbGuardian.longitude !== longitude)) {
      checkInObj.db.dbGuardian.latitude = latitude;
      checkInObj.db.dbGuardian.longitude = longitude;

      return checkInObj.db.dbGuardian.save()
        .then(() => {
          return checkInObj.db.dbGuardian.reload();
        });
    }
    else {
      return Promise.resolve();
    }

  },

  finalizeCheckIn: function(checkInObj) {

    try {
      checkInObj.db.dbGuardian.last_check_in = new Date();
      checkInObj.db.dbGuardian.check_in_count = 1 + checkInObj.db.dbGuardian.check_in_count;
      checkInObj.db.dbCheckIn.request_latency_api = (new Date()).valueOf() - checkInObj.meta.checkStartTime.valueOf();
    }
    catch (e) {
      return Promise.reject(e);
    }
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
