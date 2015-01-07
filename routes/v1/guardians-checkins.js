var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require('../../models');
var express = require('express');
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require('querystring');
var hash = require("../../misc/hash.js").hash;
var aws = require("../../config/aws.js").aws();

router.route("/:guardian_id/checkins")
  .post(function(req, res) {

    var json = JSON.parse(querystring.parse("all="+req.body.json).all);

    if (verbose_logging) { console.log(json); }

    models.Guardian
      .findOrCreate({ where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian, wasCreated){
      console.log("matched to guardian: "+dbGuardian.guid);

      models.GuardianSoftware
        .findAll({
          where: { number: json.software_version }/*,
          defaults: { number: json.software_version, is_available: false }*/
          }).spread(function(dSoftware){
          console.log("matched to software version: "+dSoftware.number);

          dbGuardian.last_check_in = new Date();
          dbGuardian.check_in_count = 1+dbGuardian.check_in_count;          
          dbGuardian.version_id = dSoftware.id;
          dbGuardian.save();
          console.log("software version saved to guardian: "+dSoftware.number);

          models.GuardianCheckIn.create({
            guardian_id: dbGuardian.id,
            version_id: dSoftware.id,
            cpu_percent: strArrToAvg(json.cpu_percent,","),
            cpu_clock: strArrToAvg(json.cpu_clock,","),
            battery_percent: strArrToAvg(json.battery_percent,","),
            battery_temperature: strArrToAvg(json.battery_temperature,","),
            network_search_time: strArrToAvg(json.network_search_time,","),
            internal_luminosity: strArrToAvg(json.internal_luminosity,","),
            network_transmit_time: null,
            measured_at: Date.parse(json.measured_at)
          }).then(function(dbCheckIn){
            console.log("check-in created: "+dbCheckIn.guid);

            if (!!req.files.audio) {
              if (!util.isArray(req.files.audio)) { req.files.audio = [req.files.audio]; }
              var audioMeta = json.audio.split("|");
              if (audioMeta.length == req.files.audio.length) {
              console.log(req.files.audio.length + " audio files to ingest...");
              var s3SuccessCounter = [];
                for (i in req.files.audio) {
                  audioMeta[i] = audioMeta[i].split("*");
                  audioMeta[i][1] = new Date(parseInt(audioMeta[i][1]));
                  var audioInfo = {
                    guardian_id: dbGuardian.guid,
                    checkin_id: dbCheckIn.guid,
                    sha1Hash: hash.fileSha1(req.files.audio[i].path),
                    measured_at: audioMeta[i][1],
                    s3Path: "/"+process.env.NODE_ENV
                            +"/guardians/"+dbGuardian.guid
                            +"/"+audioMeta[i][1].toISOString().substr(0,10).replace(/-/g,"/")
                            +"/"+dbGuardian.guid+"-"
                                +audioMeta[i][1].toISOString().substr(0,19).replace(/:/g,"-")
                                +req.files.audio[i].originalname.substr(req.files.audio[i].originalname.indexOf("."))
                  };

                  models.GuardianAudio.create({
                    guardian_id: dbGuardian.id,
                    check_in_id: dbCheckIn.id,
                    sha1_checksum: audioInfo.sha1Hash,
                    url: "s3://rfcx-ark"+audioInfo.s3Path,
                    size: fs.statSync(req.files.audio[i].path).size,
            //        length: null,
                    measured_at: audioInfo.measured_at
                  }).then(function(dbAudio){
                    audioInfo.audio_id = dbAudio.guid;

                    saveCheckInAudio(req, res, audioInfo, function(req, res, audioInfo){
                      addAudioToIngestionQueue(req, res, audioInfo, function(req, res, audioInfo){
                        dbAudio.ingestion_sqs_msg_id = audioInfo.ingestion_sqs_msg_id;
                        dbAudio.save().then(function(){
                          s3SuccessCounter.push(true);
                          asyncHttpResponseSetter(req, res, audioInfo, s3SuccessCounter, (i == (req.files.audio.length-1)));
                        }).catch(function(err){
                          s3SuccessCounter.push(false);
                          asyncHttpResponseSetter(req, res, audioInfo, s3SuccessCounter, (i == (req.files.audio.length-1)));
                        });
                      
                      });
                    });

                  }).catch(function(err){
                    console.log("error adding audio to database | "+err);
                  });
                }
              } else {
                console.log("couldn't match audio meta to uploaded content | "+audioMeta);
              }
            } else {
              console.log("no audio files detected");
            }
          }).catch(function(err){
            console.log("error adding checkin to database | "+err);
          });
        }).catch(function(err){
          console.log("failed to update version of guardian | "+err);
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

function asyncHttpResponseSetter(req, res, audioInfo, s3SuccessCounter, isLastLoop) {
  if (isLastLoop && (req.files.audio.length == s3SuccessCounter.length)) {
    if (s3SuccessCounter.indexOf(false) == -1) {
      res.status(200).json(audioInfo);
    } else {
      res.status(500).json({"s3Saving": s3SuccessCounter, "audioInfo": audioInfo});
    }
  } else if (isLastLoop) {
    res.status(500).json({"s3Saving": s3SuccessCounter, "audioInfo": audioInfo});
  }
}

function saveCheckInAudio(req, res, audioInfo, callback) {  
  console.log("uploading file to s3");
  aws.s3("rfcx-ark").putFile(
    req.files.audio[i].path, audioInfo.s3Path, 
    function(err, s3Res){
      s3Res.resume();
      fs.unlink(req.files.audio[i].path,function(err){ if (err) throw err; });
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


function strArrToAvg(str,delim) {
  if (str == null) { return null; }
  var ttl = 0, arr = str.split(delim);
  if (arr.length > 0) {
    for (i in arr) { ttl = ttl + parseInt(arr[i]); }
    return Math.round(ttl/arr.length);
  } else {
    return null;
  }
}


