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
