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
      .then(function(json){

        // during development, we dump the meta json to the console (ultra verbose)
        if (verbose_logging) { console.log(json); }
        
        // retrieve the guardian from the database
        models.Guardian
          .findOne({ 
            where: { guid: req.params.guardian_id }
        }).then(function(dbGuardian){

          // TO DO - move into helper method
          dbGuardian.last_check_in = new Date();
          dbGuardian.check_in_count = 1+dbGuardian.check_in_count;
          dbGuardian.save();

          // add a new checkin to the database
          models.GuardianCheckIn
            .create({
              guardian_id: dbGuardian.id,
              site_id: dbGuardian.site_id,
              measured_at: timeStampToDate(json.measured_at, json.timezone_offset),
              queued_at: timeStampToDate(json.queued_at, json.timezone_offset),
              guardian_queued_checkins: parseInt(json.queued_checkins),
              guardian_skipped_checkins: parseInt(json.skipped_checkins),
              guardian_stashed_checkins: parseInt(json.stashed_checkins),
              is_certified: dbGuardian.is_certified
          }).then(function(dbCheckIn){

            // set checkin guid on global json return object
            returnJson.checkin_id = dbCheckIn.guid;

            // save guardian meta data
            checkInHelpers.saveMeta.DataTransfer(strArrToJSArr(json.data_transfer,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.CPU(strArrToJSArr(json.cpu,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.Battery(strArrToJSArr(json.battery,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.Power(strArrToJSArr(json.power,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.Network(strArrToJSArr(json.network,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.Offline(strArrToJSArr(json.offline,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.LightMeter(strArrToJSArr(json.lightmeter,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.Accelerometer(strArrToJSArr(json.accelerometer,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.DiskUsage(strArrToJSArr(json.disk_usage,"|","*"), dbGuardian.id, dbCheckIn.id);
            checkInHelpers.saveMeta.GeoLocation(strArrToJSArr(json.location,"|","*"), dbGuardian.id, dbCheckIn.id);

            // save reboot events
            checkInHelpers.saveMeta.RebootEvents(strArrToJSArr(json.reboots,"|","*"), dbGuardian.id, dbCheckIn.id);

            // save software role versions
            checkInHelpers.saveMeta.SoftwareRoleVersion(strArrToJSArr(json.software,"|","*"), dbGuardian.id);

            // update previous checkin info, if included
            checkInHelpers.saveMeta.PreviousCheckIns(strArrToJSArr(json.previous_checkins,"|","*"));

            // parse, review and save sms messages
            var messageInfo = checkInHelpers.messages.info(json.messages, dbGuardian.id, dbCheckIn.id, json.timezone_offset);
            for (msgInfoInd in messageInfo) {
              checkInHelpers.messages.save(messageInfo[msgInfoInd])
                .then(function(rtrnMessageInfo){
                  returnJson.messages.push({ id: rtrnMessageInfo.android_id, guid: rtrnMessageInfo.guid });
                });
            }
            
            // parse, review and save screenshots
            var screenShotInfo = checkInHelpers.screenshots.info(req.files.screenshot, strArrToJSArr(json.screenshots,"|","*"), dbGuardian.id, dbGuardian.guid, dbCheckIn.id);
            for (screenShotInfoInd in screenShotInfo) {
              checkInHelpers.screenshots.save(screenShotInfo[screenShotInfoInd])
                .then(function(rtrnScreenShotInfo){
                  returnJson.screenshots.push({ id: rtrnScreenShotInfo.origin_id, guid: rtrnScreenShotInfo.screenshot_id });
                });
            }

            // add messages instructions
            // returnJson.instructions.messages.push({
            //   body: "From  "+dbGuardian.guid,
            //   address: "+14153359205",
            //   guid: "guid goes here"
            // });


            // TO DO - move into helper method
            // add prefs instructions as set in database
            for (guardianInd in dbGuardian.dataValues) {
              if ((guardianInd.substr(0,6) === "prefs_") && (dbGuardian.dataValues[guardianInd] != null)) {
           //     returnJson.instructions.prefs[guardianInd.substr(6)] = dbGuardian.dataValues[guardianInd];
              }
            }

            // parse, review and save audio
            var audioInfo = checkInHelpers.audio.info(req.files.audio, req.rfcx.api_url_domain, strArrToJSArr(json.audio,"|","*"), dbGuardian, dbCheckIn);
            
            for (audioInfoInd in audioInfo) {
              checkInHelpers.audio.processUpload(audioInfo[audioInfoInd]).then(function(audioInfoPostUpload){
                checkInHelpers.audio.saveToS3(audioInfoPostUpload).then(function(audioInfoPostS3Save){
                  checkInHelpers.audio.saveToDb(audioInfoPostS3Save).then(function(audioInfoPostDbSave){
                    checkInHelpers.audio.queueForTaggingByActiveModels(audioInfoPostDbSave).then(function(audioInfoPostQueue){

                        returnJson.audio.push({ id: audioInfoPostQueue.timeStamp, guid: audioInfoPostQueue.audio_guid });

                        dbCheckIn.request_latency_api = (new Date()).valueOf()-req.rfcx.request_start_time;
                        dbCheckIn.save();
                        if (verbose_logging) { console.log(returnJson); }
                        res.status(200).json(returnJson);

                        checkInHelpers.audio.extractAudioFileMeta(audioInfoPostQueue);
                    }).catch(function(err){
                      checkInHelpers.audio.rollBackCheckIn(audioInfoPostDbSave);
                      if (!!err) { res.status(500).json({msg:"error creating access token for analysis worker"}); }
                    });
                  }).catch(function(err){
                    checkInHelpers.audio.rollBackCheckIn(audioInfoPostS3Save);
                    if (!!err) { res.status(500).json({msg:"error adding audio to database"}); }
                  });
                }).catch(function(err){
                  checkInHelpers.audio.rollBackCheckIn(audioInfoPostUpload);
                  if (!!err) { res.status(500).json({msg:"error saving audio to s3"}); }
                });
              }).catch(function(err){
                checkInHelpers.audio.rollBackCheckIn(audioInfo[audioInfoInd]);
                if (!!err) { res.status(500).json({msg:"error processing audio upload file"}); }
              });
            }
            

          }).catch(function(err){
            console.log("error adding checkin to database | "+err);
            if (!!err) { httpError(res, 500, "database"); }
          });

      // if we can't find the guardian referenced in the checkin request
      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { httpError(res, 404, "database"); }
      });

    // catch error on unzipping of gzipped meta json
    }).catch(function(gZipErr){
      httpError(res, 500, "parse");
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


