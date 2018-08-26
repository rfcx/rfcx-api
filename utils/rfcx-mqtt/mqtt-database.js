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
    return new Promise(function(resolve, reject) {
        try {
          models.Guardian.findOne({
              where: { guid: checkInObj.json.guardian_guid },
              include: [ { all: true } ]
            }).then(function(dbGuardian){

              checkInObj.db.dbGuardian = dbGuardian;
              resolve(checkInObj);

          }).catch(function(errGetDbGuardianQuery){ console.log(errGetDbGuardianQuery); reject(new Error(errGetDbGuardianQuery)); });
        } catch (errGetDbGuardian) { console.log(errGetDbGuardian); reject(new Error(errGetDbGuardian)); }
    }.bind(this));
  },

  createDbCheckIn: function(checkInObj) {
    return new Promise(function(resolve, reject) {
        try {

          var checkInStats = {}, checkInStatArray = strArrToJSArr(checkInObj.json.checkins,"|","*");
          for (vInd in roleArr) { 
            checkInStats[checkInStatArray[vInd][0]] = checkInStatArray[vInd][1];
          }
          console.log(JSON.stringify(checkInStats));

          models.GuardianCheckIn.create({
            guardian_id: checkInObj.db.dbGuardian.id,
            site_id: checkInObj.db.dbGuardian.site_id,
            measured_at: new Date(parseInt(checkInObj.json.measured_at)),
            queued_at: new Date(parseInt(checkInObj.json.queued_at)),
            guardian_queued_checkins: parseInt(checkInObj.json.queued_checkins),
            guardian_skipped_checkins: parseInt(checkInObj.json.skipped_checkins),
            guardian_stashed_checkins: parseInt(checkInObj.json.stashed_checkins),
            is_certified: checkInObj.db.dbGuardian.is_certified
          }).then(function(dbCheckIn){

            checkInObj.db.dbCheckIn = dbCheckIn;
            checkInObj.rtrn.obj.checkin_id = dbCheckIn.guid;
            resolve(checkInObj);

          }).catch(function(errCreateDbCheckInQuery){ console.log(errCreateDbCheckInQuery); reject(new Error(errCreateDbCheckInQuery)); });
        } catch (errCreateDbCheckIn) { console.log(errCreateDbCheckIn); reject(new Error(errCreateDbCheckIn)); }
    }.bind(this));
  },

  saveDbMessages: function(checkInObj) {
    return new Promise(function(resolve, reject) {
      var msgs = [];
      try {
        var msgInfo = 
          smsMessages.info(
            checkInObj.json.messages, checkInObj.db.dbGuardian.id, 
            checkInObj.db.dbCheckIn.id, checkInObj.json.timezone_offset
          );
        for (msgInfoInd in msgInfo) {
          smsMessages.save(msgInfo[msgInfoInd]).then(function(rtrnMsgs){ }).catch(function(errSaveMsg){ console.log(errSaveMsg); });
          msgs.push({ id: msgInfo[msgInfoInd].android_id });
        }
        resolve(msgs);
      } catch (errSaveDbMessages) { console.log(errSaveDbMessages); reject(new Error(errSaveDbMessages)); }
    }.bind(this));
  },

  createDbSaveMeta: function(checkInObj) {
    try {

      var guardianId = checkInObj.db.dbGuardian.id, checkInId = checkInObj.db.dbCheckIn.id;

      saveMeta.DataTransfer(strArrToJSArr(checkInObj.json.data_transfer,"|","*"), guardianId, checkInId);
      saveMeta.CPU(strArrToJSArr(checkInObj.json.cpu,"|","*"), guardianId, checkInId);
      saveMeta.Battery(strArrToJSArr(checkInObj.json.battery,"|","*"), guardianId, checkInId);
      saveMeta.Power(strArrToJSArr(checkInObj.json.power,"|","*"), guardianId, checkInId);
      saveMeta.Network(strArrToJSArr(checkInObj.json.network,"|","*"), guardianId, checkInId);
      saveMeta.Offline(strArrToJSArr(checkInObj.json.offline,"|","*"), guardianId, checkInId);
      saveMeta.LightMeter(strArrToJSArr(checkInObj.json.lightmeter,"|","*"), guardianId, checkInId);
      saveMeta.Accelerometer(strArrToJSArr(checkInObj.json.accelerometer,"|","*"), guardianId, checkInId);
      saveMeta.DiskUsage(strArrToJSArr(checkInObj.json.disk_usage,"|","*"), guardianId, checkInId);
      saveMeta.GeoLocation(strArrToJSArr(checkInObj.json.location,"|","*"), guardianId, checkInId);

      saveMeta.RebootEvents(strArrToJSArr(checkInObj.json.reboots,"|","*"), guardianId, checkInId);
      saveMeta.SoftwareRoleVersion(strArrToJSArr(checkInObj.json.software,"|","*"), guardianId);
      saveMeta.PreviousCheckIns(strArrToJSArr(checkInObj.json.previous_checkins,"|","*"));

    } catch (errDbSaveMeta) { console.log(errDbSaveMeta); reject(new Error(errDbSaveMeta)); }
  },

  createDbAudio: function(checkInObj) {
    return new Promise(function(resolve, reject) {

      let dbAudioLocal;

      models.GuardianAudio.findOrCreate({
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
      }).spread(function(dbAudio, wasCreated){
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
          })
      }).spread(function(dbAudioFormat, wasCreated){
        dbAudioLocal.format_id = dbAudioFormat.id;
        return dbAudioLocal.save();
      })
      .then(function(dbAudio) {
        return dbAudio.reload();
      }).then(function(dbAudio) {
        checkInObj.db.dbAudio= dbAudio;
        checkInObj.rtrn.obj.audio.push({ id: checkInObj.audio.metaArr[1] });
        resolve(checkInObj);
      }).catch(function(errCreateDbAudioQuery){ console.log(errCreateDbAudioQuery); reject(new Error(errCreateDbAudioQuery)); });

    }.bind(this));
  },

  createDbScreenShot: function(checkInObj) {
    return new Promise(function(resolve, reject) {

        if (checkInObj.screenshots.filePath == null) {
          resolve(checkInObj);
        } else {

          fs.stat(checkInObj.screenshots.filePath, function(statErr, fileStat) {
            if (!!statErr) { reject(statErr); }

            models.GuardianMetaScreenShot.findOrCreate({
              where: {
                sha1_checksum: checkInObj.screenshots.metaArr[3]
              },
              defaults: {
                guardian_id: checkInObj.db.dbGuardian.id,
                sha1_checksum: checkInObj.screenshots.metaArr[3],
                url: null,
                captured_at: new Date(parseInt(checkInObj.screenshots.metaArr[1])),
                size: fileStat.size
              }
            }).then(function(dbScreenShot) {
              checkInObj.db.dbScreenShot= dbScreenShot;
              checkInObj.rtrn.obj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] });
              resolve(checkInObj);
            }).catch(function(errCreateDbScreenShotQuery){ console.log(errCreateDbScreenShotQuery); reject(new Error(errCreateDbScreenShotQuery)); });

          });
        }

    }.bind(this));
  },

  createDbLogFile: function(checkInObj) {
    return new Promise(function(resolve, reject) {

        if (checkInObj.logs.filePath == null) {
          resolve(checkInObj);
        } else {

          fs.stat(checkInObj.logs.filePath, function(statErr, fileStat) {
            if (!!statErr) { reject(statErr); }

            models.GuardianMetaLog.findOrCreate({
              where: {
                sha1_checksum: checkInObj.logs.metaArr[3]
              },
              defaults: {
                guardian_id: checkInObj.db.dbGuardian.id,
                sha1_checksum: checkInObj.logs.metaArr[3],
                url: null,
                captured_at: new Date(parseInt(checkInObj.logs.metaArr[1])),
                size: fileStat.size
              }
            }).then(function(dbLogs) {
              checkInObj.db.dbLogs= dbLogs;
              checkInObj.rtrn.obj.logs.push({ id: checkInObj.logs.metaArr[1] });
              resolve(checkInObj);
            }).catch(function(errCreateDbLogsQuery){ console.log(errCreateDbLogsQuery); reject(new Error(errCreateDbLogsQuery)); });
            
          });
        }

    }.bind(this));
  },

  finalizeCheckIn: function(checkInObj) {

    checkInObj.db.dbGuardian.last_check_in = new Date();
    checkInObj.db.dbGuardian.check_in_count = 1 + checkInObj.db.dbGuardian.check_in_count;
    checkInObj.db.dbGuardian.save();
    checkInObj.db.dbGuardian.reload();

    checkInObj.db.dbCheckIn.request_latency_api = (new Date()).valueOf() - checkInObj.meta.checkStartTime.valueOf();
    checkInObj.db.dbCheckIn.save();
    checkInObj.db.dbCheckIn.reload();
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
