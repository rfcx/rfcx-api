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
var websocket = require('../../../utils/websocket');
var urls = require('../../../utils/misc/urls');
var sequelize = require("sequelize");
const moment = require("moment-timezone");

var logDebug = loggers.debugLogger.log;

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
        logDebug('Guardian checkins endpoint: unzipped json', { req: req, json: json });
        // retrieve the guardian from the database
        return models.Guardian.findOne({
          where: { guid: req.params.guardian_id },
          include: [ { all: true } ],
        });
      })
      .then(function(dbGuardian){
        if (!dbGuardian) {
          loggers.errorLogger.log('Guardian with given guid not found', { req: req });
          throw new sequelize.EmptyResultError('Guardian with given guid not found.');
        }
        logDebug('Guardian checkins endpoint: dbGuardian founded', {
          req: req,
          guardian: Object.assign({}, dbGuardian.toJSON()),
        });
        dbGuardian.last_check_in = new Date();
        dbGuardian.check_in_count = 1 + dbGuardian.check_in_count;
        return dbGuardian.save();
      })
      .then((dbGuardian) => {
        return dbGuardian.reload();
      })
      .then(function(dbGuardian) {
        logDebug('Guardian checkins endpoint: dbGuardian updated', {
          req: req,
          guardian: Object.assign({}, dbGuardian.toJSON()),
        });
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
        logDebug('Guardian checkins endpoint: dbCheckIn created', {
          req: req,
          guardian: dbCheckIn.toJSON(),
        });
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
        logDebug('Guardian checkins endpoint: metadata saved', { req: req });
        // save reboot events
        return checkInHelpers.saveMeta.RebootEvents(strArrToJSArr(this.json.reboots,"|","*"), this.dbGuardian.id, this.dbCheckIn.id);
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: RebootEvents finished', { req: req });
        // save software role versions
        return checkInHelpers.saveMeta.SoftwareRoleVersion(strArrToJSArr(this.json.software,"|","*"), this.dbGuardian.id);
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: SoftwareRoleVersion finished', { req: req });
        // update previous checkin info, if included
        return checkInHelpers.saveMeta.PreviousCheckIns(strArrToJSArr(this.json.previous_checkins,"|","*"));
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: PreviousCheckIns finished', { req: req });
        // parse, review and save sms messages
        var messageInfo = checkInHelpers.messages.info(this.json.messages, this.dbGuardian.id, this.dbCheckIn.id,
                                                       this.json.timezone_offset);
        logDebug('Guardian checkins endpoint: messageInfo', { req: req, messageInfo: messageInfo });
        var proms = [];
        for (msgInfoInd in messageInfo) {
          logDebug('Guardian checkins endpoint: started processing message ' + msgInfoInd, {
            req: req,
            msgInfoInd: msgInfoInd
          });
          var prom = checkInHelpers.messages
            .save(messageInfo[msgInfoInd])
            .then(function(rtrnMessageInfo){
              logDebug('Guardian checkins endpoint: message save finished', {
                req: req,
                msgInfoInd: msgInfoInd,
                rtrnMessageInfo: rtrnMessageInfo,
              });
              return returnJson.messages.push({ id: rtrnMessageInfo.android_id, guid: rtrnMessageInfo.guid });
            });
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: messages processed', { req: req });
        // parse, review and save screenshots
        var screenShotInfo = checkInHelpers.screenshots.info(req.files.screenshot, strArrToJSArr(this.json.screenshots,"|","*"),
                                                             this.dbGuardian.id, this.dbGuardian.guid, this.dbCheckIn.id);
        logDebug('Guardian checkins endpoint: screenShotInfo', { req: req, screenShotInfo: screenShotInfo });
        var proms = [];
        for (screenShotInfoInd in screenShotInfo) {
          logDebug('Guardian checkins endpoint: started processing screenshot ' + screenShotInfoInd, {
            req: req,
            screenShotInfoInd: screenShotInfoInd
          });
          var prom = checkInHelpers.screenshots
            .save(screenShotInfo[screenShotInfoInd])
            .then(function(rtrnScreenShotInfo){
              logDebug('Guardian checkins endpoint: screenshot save finished', {
                req: req,
                screenShotInfoInd: screenShotInfoInd,
                rtrnScreenShotInfo: rtrnScreenShotInfo,
              });
              return returnJson.screenshots.push({ id: rtrnScreenShotInfo.origin_id, guid: rtrnScreenShotInfo.screenshot_id });
            });
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: screenshots processed', { req: req });
        var self = this;
        // parse, review and save audio
        var audioInfo = checkInHelpers.audio.info(req.files.audio, req.rfcx.api_url_domain, strArrToJSArr(this.json.audio,"|","*"),
                                                  this.dbGuardian, this.dbCheckIn);
        logDebug('Guardian checkins endpoint: audioInfo', { req: req, audioInfo: audioInfo });
        var proms = [];
        for (audioInfoInd in audioInfo) {
          logDebug('Guardian checkins endpoint: started processing audio ' + audioInfoInd, {
            req: req,
            audioInfoInd: audioInfoInd
          });
          var prom = checkInHelpers.audio
            .processUpload(audioInfo[audioInfoInd])
            .bind({})
            .then(function(audioInfoPostUpload){
              logDebug('Guardian checkins endpoint: processUpload finished', {
                req: req,
                audioInfoInd: audioInfoInd,
                audioInfoPostUpload: audioInfoPostUpload,
              });
              this.audioInfoCurrent = audioInfo[audioInfoInd];
              return checkInHelpers.audio.saveToS3(audioInfoPostUpload)
            })
            .then(function(audioInfoPostS3Save){
              logDebug('Guardian checkins endpoint: saveToS3 finished', {
                req: req,
                audioInfoInd: audioInfoInd,
                audioInfoPostS3Save: audioInfoPostS3Save,
              });
              return checkInHelpers.audio.saveToDb(audioInfoPostS3Save)
            })
            .then(function(audioInfoPostDbSave){
              logDebug('Guardian checkins endpoint: saveToDb finished', {
                req: req,
                audioInfoInd: audioInfoInd,
                audioInfoPostDbSave: audioInfoPostDbSave,
              });
              return checkInHelpers.audio.queueForTaggingByActiveModels(audioInfoPostDbSave)
            })
            .then(function(audioInfoPostQueue){
              logDebug('Guardian checkins endpoint: queueForTaggingByActiveModels finished', {
                req: req,
                audioInfoInd: audioInfoInd,
                audioInfoPostQueue: audioInfoPostQueue,
              });
              this.audioInfoPostQueue = audioInfoPostQueue;
              returnJson.audio.push({ id: audioInfoPostQueue.timeStamp, guid: audioInfoPostQueue.audio_guid });
              self.dbCheckIn.request_latency_api = (new Date()).valueOf()-req.rfcx.request_start_time;
              return self.dbCheckIn.save();
            })
            .then(function() {
              logDebug('Guardian checkins endpoint: request_latency_api updated', {
                req: req,
                audioInfoInd: audioInfoInd,
              });
              return checkInHelpers.audio.extractAudioFileMeta(this.audioInfoPostQueue);
            })
            .then(function() {
              logDebug('Guardian checkins endpoint: extracted audio file meta', { req: req, audioInfo: audioInfo, audioInfoInd: audioInfoInd });
              let audioInfoCurrent = Object.assign({}, this.audioInfoCurrent);
              models.GuardianAudio
                .findOne({
                  where: { id: audioInfoCurrent.audio_id },
                  include: [ { all: true } ]
                })
                .then(function(dbAudio) {
                  logDebug('Guardian checkins endpoint: founded dbAudio', {
                    req: req,
                    dbAudio: dbAudio,
                  });
                  let wsObj = checkInHelpers.audio.prepareWsObject(req, audioInfoCurrent, self.dbGuardian, dbAudio);
                  websocket.send('createAudioSensation', wsObj);
                  return true;
                })
                .catch(function(err) {
                  loggers.errorLogger.log('Failed to send websocket data for guardian checkin', { req: req, err: err });
                });
              return true;
            })
          proms.push(prom);
        }
        return Promise.all(proms);
      })
      .then(function() {
        logDebug('Guardian checkins endpoint: audios processed', { req: req });
        logDebug('Guardian checkins endpoint: return json', { req: req, json: returnJson });
        return res.status(200).json(returnJson);
      })
      .catch(sequelize.EmptyResultError, function(err) {
        loggers.errorLogger.log('Failed to save checkin', { req: req, err: err });
        httpError(req, res, 404, null, err.message);
      })
      .catch(function(err) {
        loggers.errorLogger.log('Failed to save checkin', { req: req, err: err });
        httpError(req, res, 500, err, 'failed to save checkin');
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
              httpError(req, res, 404, "database");
            } else {
              views.models.guardianCheckIns(req,res,dbCheckIn)
                .then(function(json){ res.status(200).json(json); });
            }

          }).catch(function(err){
            console.log(err);
            if (!!err) { httpError(req, res, 500, "database"); }
          });

      }).catch(function(err){
        console.log(err);
        if (!!err) { httpError(req, res, 500, "database"); }
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
