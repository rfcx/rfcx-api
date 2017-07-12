var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var fs = require("fs");
var zlib = require("zlib");
var util = require("util");
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var aws = require("../../../utils/external/aws.js").aws();
var views = require("../../../views/v1");
var checkInHelpers = require("../../../utils/rfcx-checkin");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var Promise = require('bluebird');
var loggers = require('../../../utils/logger');

router.route("/:guardian_id/checkins")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    // template for json return... to be populated as we progress
    var returnJson = {
      checkin_id: null, // unique guid of the check-in
      audio: [], // array of audio files successfully ingested
      screenshots: [], // array of screenshot images successfully ingested
      messages: [], // array of sms messages successfully ingested
      instructions: {
        messages: [] // array of sms messages that the guardian should send
      }
    };

    // unzip gzipped meta json blob
    checkInHelpers.gzip.unZipJson(req.body.meta)
      .bind({})
      .then(function(json){
        this.json = json;
        loggers.debugLogger.log('Guardian checkins endpoint: unzipped json', { req: req, json: json });
        // retrieve the guardian from the database
        return models.Guardian.findOne({
          where: { guid: req.params.guardian_id }
        });
      })
      .then(function(dbGuardian){
        // TODO - move into helper method
        dbGuardian.last_check_in = new Date();
        dbGuardian.check_in_count = 1+dbGuardian.check_in_count;
        return dbGuardian.save();
      })
      .then((dbGuardian) => {
        // reload model
        return dbGuardian.reload();
      })
      .then(function(dbGuardian) {
        this.dbGuardian = dbGuardian;
          // add a new checkin to the database
        return models.GuardianCheckIn
          .create({
            guardian_id: dbGuardian.id,
            site_id: dbGuardian.site_id,
            measured_at: timeStampToDate(this.json.measured_at, this.json.timezone_offset),
            queued_at: timeStampToDate(this.json.queued_at, this.json.timezone_offset),
            guardian_queued_checkins: parseInt(this.json.queued_checkins),
            guardian_skipped_checkins: parseInt(this.json.skipped_checkins),
            guardian_stashed_checkins: parseInt(this.json.stashed_checkins),
            is_certified: dbGuardian.is_certified
        });
      })
      .then(function(dbCheckIn){
        this.dbCheckIn = dbCheckIn;
        // set checkin guid on global json return object
        returnJson.checkin_id = dbCheckIn.guid;
        // save guardian meta data
        return Promise.all([
          checkInHelpers.saveMeta.DataTransfer(strArrToJSArr(this.json.data_transfer,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.CPU(strArrToJSArr(this.json.cpu,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Battery(strArrToJSArr(this.json.battery,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Power(strArrToJSArr(this.json.power,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Network(strArrToJSArr(this.json.network,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Offline(strArrToJSArr(this.json.offline,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.LightMeter(strArrToJSArr(this.json.lightmeter,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Accelerometer(strArrToJSArr(this.json.accelerometer,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.DiskUsage(strArrToJSArr(this.json.disk_usage,"|","*"), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.GeoLocation(strArrToJSArr(this.json.location,"|","*"), this.dbGuardian.id, dbCheckIn.id),
        ]);
      })
      .then(function() {
        // save reboot events
        return checkInHelpers.saveMeta.RebootEvents(strArrToJSArr(this.json.reboots,"|","*"), this.dbGuardian.id, this.dbCheckIn.id);
      })
      .then(function() {
        // save software role versions
        return checkInHelpers.saveMeta.SoftwareRoleVersion(strArrToJSArr(this.json.software,"|","*"), this.dbGuardian.id);
      })
      .then(function() {
        // update previous checkin info, if included
        return checkInHelpers.saveMeta.PreviousCheckIns(strArrToJSArr(this.json.previous_checkins,"|","*"));
      })
      .then(function() {
        // parse, review and save sms messages
        var messageInfo = checkInHelpers.messages.info(this.json.messages, this.dbGuardian.id, this.dbCheckIn.id,
                                                       this.json.timezone_offset);
        var proms = [];
        for (msgInfoInd in messageInfo) {
          var prom = checkInHelpers.messages
            .save(messageInfo[msgInfoInd])
            .then(function(rtrnMessageInfo){
              return returnJson.messages.push({ id: rtrnMessageInfo.android_id, guid: rtrnMessageInfo.guid });
            });
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        // parse, review and save screenshots
        var screenShotInfo = checkInHelpers.screenshots.info(req.files.screenshot, strArrToJSArr(this.json.screenshots,"|","*"),
                                                             this.dbGuardian.id, this.dbGuardian.guid, this.dbCheckIn.id);
        var proms = [];
        for (screenShotInfoInd in screenShotInfo) {
          var prom = checkInHelpers.screenshots
            .save(screenShotInfo[screenShotInfoInd])
            .then(function(rtrnScreenShotInfo){
              return returnJson.screenshots.push({ id: rtrnScreenShotInfo.origin_id, guid: rtrnScreenShotInfo.screenshot_id });
            });
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        // parse, review and save audio
        var audioInfo = checkInHelpers.audio.info(req.files.audio, req.rfcx.api_url_domain, strArrToJSArr(this.json.audio,"|","*"),
                                                  this.dbGuardian, this.dbCheckIn);
        var proms = [];
        for (audioInfoInd in audioInfo) {
          var prom = checkInHelpers.audio
            .processUpload(audioInfo[audioInfoInd])
            .bind({})
            .then(function(audioInfoPostUpload){
              return checkInHelpers.audio.saveToS3(audioInfoPostUpload)
            })
            .then(function(audioInfoPostS3Save){
              return checkInHelpers.audio.saveToDb(audioInfoPostS3Save)
            })
            .then(function(audioInfoPostDbSave){
              return checkInHelpers.audio.queueForTaggingByActiveModels(audioInfoPostDbSave)
            })
            .then(function(audioInfoPostQueue){
              this.audioInfoPostQueue = audioInfoPostQueue;
              returnJson.audio.push({ id: audioInfoPostQueue.timeStamp, guid: audioInfoPostQueue.audio_guid });
              this.dbCheckIn.request_latency_api = (new Date()).valueOf()-req.rfcx.request_start_time;
              return this.dbCheckIn.save();
            })
            .then(function() {
              return checkInHelpers.audio.extractAudioFileMeta(this.audioInfoPostQueue);
            });
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        loggers.debugLogger.log('Guardian checkins endpoint: return json', { req: req, json: returnJson });
        return res.status(200).json(returnJson);
      });
  })
;

router.route("/:guardian_id/checkins")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        var dbQuery = { guardian_id: dbGuardian.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }

        models.GuardianCheckIn
          .findAll({
            where: dbQuery,
            include: [ { all: true } ],
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbCheckIn){

            if (dbCheckIn.length < 1) {
              httpError(res, 404, "database");
            } else {
              views.models.guardianCheckIns(req,res,dbCheckIn)
                .then(function(json){ res.status(200).json(json); });
            }

          }).catch(function(err){
            console.log(err);
            if (!!err) { httpError(res, 500, "database"); }
          });

      }).catch(function(err){
        console.log(err);
        if (!!err) { httpError(res, 500, "database"); }
      });

  })
;

module.exports = router;

function timeStampToDate(timeStamp, LEGACY_timeZoneOffset) {

  var asDate = null;

  // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
  if ((""+timeStamp).indexOf(":") > -1) {
    // LEGACY TIMESTAMP FORMAT
    asDate = new Date(timeStamp.replace(/ /g,"T")+LEGACY_timeZoneOffset);
  } else if (timeStamp != null) {

    asDate = new Date(parseInt(timeStamp));

  }
  return asDate;
}

// Special Functions

function strArrToJSArr(str,delimA,delimB) {
  if ((str == null) || (str.length == 0)) { return []; }
  try {
    var rtrnArr = [], arr = str.split(delimA);
    if (arr.length > 0) {
      for (i in arr) {
        rtrnArr.push(arr[i].split(delimB));
      }
      return rtrnArr;
    } else {
      return [];
    }
  } catch(e) {
    console.log(e);
    return [];
  }
}


