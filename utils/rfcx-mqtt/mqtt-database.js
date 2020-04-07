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
        where: { id: checkInObj.db.dbGuardian.site_id }
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
        checkInObj.rtrn.obj.messages = msgs
        return checkInObj
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

    return Promise.all(proms)
      .then(() => {
        return checkInObj;
      });

  },

  updateDbMetaAssetsExchangeLog: function(checkInObj) {

    var guardianId = checkInObj.db.dbGuardian.id;
    // arrays of return values for checkin response json
    var metaReturnArray = [], purgedReturnArray = [], requeueReturnArray = [], receivedReturnArray = [];

    let proms = [];
    // create meta asset entries in database
    if (checkInObj.json.meta_ids != null) {
      for (var i = 0; i < checkInObj.json.meta_ids.length; i++) {
        let prom = models.GuardianMetaAssetExchangeLog.findOrCreate({
          where: {
            guardian_id: guardianId,
            asset_type: "meta",
            asset_id: checkInObj.json.meta_ids[i]
          }
        });
        metaReturnArray.push({ id: checkInObj.json.meta_ids[i] });
        proms.push(prom);
      }
    }
    return Promise.all(proms)
      .then(() => {
        // parse list of purged assets from guardian, delete them from database and return list
        var dbMetaPurgedAssets = [], metaPurgedAssets = strArrToJSArr(checkInObj.json.assets_purged,"|","*");
        for (asstInd in metaPurgedAssets) {
          if (metaPurgedAssets[asstInd][1] != null) {
            dbMetaPurgedAssets.push({
              guardian_id: guardianId,
              asset_type: metaPurgedAssets[asstInd][0],
              asset_id: metaPurgedAssets[asstInd][1]
            });
            purgedReturnArray.push({ type: metaPurgedAssets[asstInd][0], id: metaPurgedAssets[asstInd][1] });
          }
        }
        // parse list of audio ids marked as 'sent' by guardian, confirm that they are present in exchange log table
        let promsExchLogs = [];
        if (checkInObj.json.checkins_to_verify != null) {
          for (var i = 0; i < checkInObj.json.checkins_to_verify.length; i++) {
            let prom = models.GuardianMetaAssetExchangeLog.findOne({
                where: {
                  guardian_id: guardianId,
                  asset_type: "audio",
                  asset_id: checkInObj.json.checkins_to_verify[i]
                }
              })
              .then((dbAssetEntry) => {
                if (dbAssetEntry != null) {
                  receivedReturnArray.push({ type: "audio", id: dbAssetEntry.asset_id });
                }
              });
            promsExchLogs.push(prom);
          }
        }

        return Promise.all(promsExchLogs)
          .then(() => {
            if (dbMetaPurgedAssets.length > 0) {
              let proms = dbMetaPurgedAssets.map((item) => {
                return models.GuardianMetaAssetExchangeLog.destroy({ where: item })
              });
              return Promise.all(proms);
            }
            else {
              return Promise.all(promsExchLogs);
            }
          })
      })
      .then(() => {

        //if (checkInObj.json.checkins_to_verify != null) {
        //   for (var i = 0; i < checkInObj.json.checkins_to_verify.length; i++) {
        //     mustReQueue = true;
        //     for (var j = 0; j < receivedReturnArray.length; j++) {
        //       if (checkInObj.json.checkins_to_verify[i] == receivedReturnArray[j]) {
        //         mustReQueue = false;
        //         break;
        //       }
        //     }
        //     if (mustReQueue) { requeueReturnArray.push({ type: "audio", id: checkInObj.json.checkins_to_verify[i] }); }
        //   }
        //}

        // add checkin response json to overall checkInObj
        checkInObj.rtrn.obj.meta = metaReturnArray;
        checkInObj.rtrn.obj.purged = purgedReturnArray;
        checkInObj.rtrn.obj.received = receivedReturnArray;
        checkInObj.rtrn.obj.requeue = requeueReturnArray;

        return checkInObj;
      })
  },

  createDbAudio: function(checkInObj) {

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
      })
      .spread(function(dbAudioFormat, wasCreated){
        dbAudio.format_id = dbAudioFormat.id;
        return dbAudio.save();
      })
      .then(function(dbAudio) {
        return dbAudio.reload({include: [{ all: true } ]});
      })
    })
    .then(function(dbAudio) {

      return models.GuardianMetaAssetExchangeLog.findOrCreate({
        where: {
          guardian_id: checkInObj.db.dbGuardian.id,
          asset_type: "audio",
          asset_id: checkInObj.audio.metaArr[1]
        }
      })
      .then(() => {
        checkInObj.db.dbAudio = dbAudio;
        checkInObj.rtrn.obj.audio.push({ id: checkInObj.audio.metaArr[1] });
        return checkInObj;
      });
    });
  },

  createDbScreenShot: function(checkInObj) {

    if (checkInObj.screenshots.filePath === null) {
      return Promise.resolve(checkInObj);
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.screenshots.filePath, function(statErr, fileStat) {
        if (!!statErr) {
          return reject(statErr);
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
          return reject(e);
        }

        models.GuardianMetaScreenShot.findOrCreate({
          where: {
            sha1_checksum: checkInObj.screenshots.metaArr[3]
          },
          defaults
        })
        .then(function(dbScreenShot) {

          models.GuardianMetaAssetExchangeLog.findOrCreate({
            where: {
              guardian_id: checkInObj.db.dbGuardian.id,
              asset_type: "screenshot",
              asset_id: checkInObj.screenshots.metaArr[1]
            }
          })
          .then(() => {
            checkInObj.db.dbScreenShot= dbScreenShot;
            checkInObj.rtrn.obj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] });
            resolve(checkInObj);
          })

        });

      });
    })

  },

  createDbLogFile: function(checkInObj) {

    if (checkInObj.logs.filePath === null) {
      return Promise.resolve(checkInObj);
    }

    return new Promise((resolve, reject) => {
      fs.stat(checkInObj.logs.filePath, (statErr, fileStat) => {
        if (!!statErr) {
          return reject(statErr);
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
          return reject(e);
        }

        models.GuardianMetaLog.findOrCreate({
          where: {
            sha1_checksum: checkInObj.logs.metaArr[3]
          },
          defaults
        })
        .then(function(dbLogs) {
          checkInObj.db.dbLogs = dbLogs;
          checkInObj.rtrn.obj.logs.push({ id: checkInObj.logs.metaArr[1] });
          resolve(checkInObj);
        })
        .catch((err) => {
          reject(err);
        })

      });
    })
  },

  setGuardianCoordinates: (checkInObj) => {

    if (!checkInObj.json.geoposition) {
      return Promise.resolve(checkInObj);
    }

    let coordsArr = strArrToJSArr(checkInObj.json.geoposition, '|', '*');
    if (!coordsArr.length) {
      return Promise.resolve(checkInObj);
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
          return checkInObj.db.dbGuardian.reload({include: [{ all: true } ]});
        })
        .then((dbGuardian) => {
          checkInObj.db.dbGuardian = dbGuardian
          return checkInObj;
        })
    }
    else {
      return Promise.resolve(checkInObj);
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
          checkInObj.db.dbGuardian.reload({include: [{ all: true } ]}),
          checkInObj.db.dbCheckIn.reload()
        ])
      })
      .then(() => {
        return checkInObj;
      })

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
