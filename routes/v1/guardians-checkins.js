var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require('../../models');
var express = require('express');
var router = express.Router();
var fs = require("fs");
var hash = require("../../misc/hash.js").hash;
var aws = require("../../config/aws.js").aws();

router.route("/:guardian_id/checkins")
  .post(function(req, res) {

    models.Guardian
      .findOrCreate({ where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian, wasCreated){

      var temporarily_hardcoded_check_in_info = {
        version: "0.4.12",
        measured_at: new Date()
      }; var check_in = temporarily_hardcoded_check_in_info;

      models.GuardianSoftware
        .findAll({ where: { number: check_in.version } })
        .spread(function(dSoftware){
          dbGuardian.last_check_in = new Date();
          dbGuardian.check_in_count = dbGuardian.check_in_count+1;
          dbGuardian.version_id = dSoftware.id;
          dbGuardian.save();

          models.GuardianCheckIn.create({
            guardian_id: dbGuardian.id,
  //          cpu_percent: 40,
  //          cpu_clock: 100,
  //          battery_percent: 100,
  //          battery_temperature:
  //          network_search_time:
  //          internal_luminosity: 
  //          network_transmit_time:
            measured_at: check_in.measured_at
          }).then(function(dbCheckIn){

            if (!!req.files.audio) {


              var temporarily_hardcoded_measured_at = new Date();
              var audioInfo = {
                guardian_id: dbGuardian.guid,
                checkin_id: dbCheckIn.guid,
                sha1Hash: hash.fileSha1(req.files.audio.path),
                measured_at: temporarily_hardcoded_measured_at,
                s3Path: "/"+process.env.NODE_ENV
                        +"/guardians/"+dbGuardian.guid
                        +"/"+temporarily_hardcoded_measured_at.toISOString().substr(0,10).replace(/-/g,"/")
                        +"/"+dbGuardian.guid
                        +"-"+temporarily_hardcoded_measured_at.toISOString().substr(0,19).replace(/:/g,"-")
                        +req.files.audio.originalname.substr(req.files.audio.originalname.indexOf("."))
              };

              models.GuardianAudio.create({
                guardian_id: dbGuardian.id,
                check_in_id: dbCheckIn.id,
                sha1_checksum: audioInfo.sha1Hash,
                url: "s3://rfcx-ark"+audioInfo.s3Path,
                size: fs.statSync(req.files.audio.path).size,
        //        length: null,
                measured_at: audioInfo.measured_at
              }).then(function(dbAudio){
                audioInfo.audio_id = dbAudio.guid;

                saveCheckInAudio(req, res, audioInfo, function(req, res, audioInfo){
                  addAudioToIngestionQueue(req, res, audioInfo, function(req, res, audioInfo){

                    dbAudio.ingestion_sqs_msg_id = audioInfo.ingestion_sqs_msg_id;
                    dbAudio.save().then(function(){
                      res.status(200).json(audioInfo);
                    }).catch(function(err){
                      res.status(500).json(audioInfo);
                    });
                  
                  });
                });

              }).catch(function(err){
                console.log(err);
                res.status(500).json({msg:"error adding audio to database"});
              });
            }
          }).catch(function(err){
            console.log(err);
            res.status(500).json({msg:"error adding checkin to database"});
          });
        }).catch(function(err){
          console.log("failed to update version of guardian");
        });
    });
  })
;

router.route("/:guardian_id/checkins/:checkin_id")
  .get(function(req, res) {
    res.json({name:"one checkin: "+req.params.checkin_id});
  })
;

module.exports = router;

// Special Callbacks

function saveCheckInAudio(req, res, audioInfo, callback) {  
  console.log("uploading file to s3");
  aws.s3("rfcx-ark").putFile(
    req.files.audio.path, audioInfo.s3Path, 
    function(err, s3Res){
      s3Res.resume();
      fs.unlink(req.files.audio.path,function(err){ if (err) throw err; });
      if (200 == s3Res.statusCode) {
          callback(req, res, audioInfo);
      } else {
        res.status(500).json({msg:"error saving audio"});
      }

    });
}

function addAudioToIngestionQueue(req, res, audioInfo, callback) {
  console.log("adding job to sns/sqs ingestion queue");
  audioInfo.measured_at = audioInfo.measured_at.toISOString();
  
  aws.sns().publish({
      TopicArn: aws.snsTopicArn("rfcx-ingestion"),
      Message: JSON.stringify(audioInfo)
    }, function(err, data) {
      if (!!err) {
        res.status(500).json({msg:"error adding audio to ingestion queue"});
      } else {
        audioInfo.ingestion_sqs_msg_id = data.MessageId;
        callback(req, res, audioInfo);
      }
  });
}




