var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require('../../models');
var express = require('express');
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require("querystring");
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
        .findOrCreate( { where: { number: json.software_version } })
        .spread(function(dSoftware, wasCreated){
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

            if (json.messages != "") {
              var smsMsgs = json.messages.split("|");

              console.log(json.messages);
            }

            if (!!req.files.audio) {
              if (!util.isArray(req.files.audio)) { req.files.audio = [req.files.audio]; }
              var audioMeta = [];
              if (json.audio != null) { audioMeta = json.audio.split("|"); }
              if (audioMeta.length == req.files.audio.length) {
                console.log(req.files.audio.length + " audio files to ingest...");
                var audioInfo = {};
                for (i in req.files.audio) {
                  audioMeta[i] = audioMeta[i].split("*");
                  var timeStamp = audioMeta[i][1]; 
                  audioMeta[i][1] = new Date(parseInt(audioMeta[i][1]));
                  audioInfo[timeStamp] = {
                    guardian_id: dbGuardian.guid,
                    checkin_id: dbCheckIn.guid,
                    version: dSoftware.number,
                    battery_temperature: dbCheckIn.battery_temperature,
                    sha1Hash: hash.fileSha1(req.files.audio[i].path),
                    localPath: req.files.audio[i].path,
                    size: fs.statSync(req.files.audio[i].path).size,
                    timeStamp: timeStamp,
                    measured_at: audioMeta[i][1],
                    isSaved: { db: false, s3: false, sqs: false },
                    s3Path: "/"+process.env.NODE_ENV
                            +"/guardians/"+dbGuardian.guid
                            +"/"+audioMeta[i][1].toISOString().substr(0,10).replace(/-/g,"/")
                            +"/"+dbGuardian.guid+"-"
                                +audioMeta[i][1].toISOString().substr(0,19).replace(/:/g,"-")
                                +req.files.audio[i].originalname.substr(req.files.audio[i].originalname.indexOf("."))
                  };
                }

                for (j in audioInfo) {

                  models.GuardianAudio.create({
                    guardian_id: dbGuardian.id,
                    check_in_id: dbCheckIn.id,
                    sha1_checksum: audioInfo[j].sha1Hash,
                    url: "s3://rfcx-ark"+audioInfo[j].s3Path,
                    size: audioInfo[j].size,
                    measured_at: audioInfo[j].measured_at
                  }).then(function(dbAudio){

                    for (k in audioInfo) {
                      if (audioInfo[k].sha1Hash === dbAudio.sha1_checksum) {
                        
                        audioInfo[k].isSaved.db = true;
                        audioInfo[k].audio_id = dbAudio.guid;

                        console.log("uploading file to s3: "+audioInfo[k].audio_id);

                        aws.s3("rfcx-ark").putFile(
                          audioInfo[k].localPath, audioInfo[k].s3Path, 
                          function(err, s3Res){
                            s3Res.resume();
                            if (!!err) {
                              console.log(err);
                            } else if (200 == s3Res.statusCode) {
                              for (l in audioInfo) {
                                if (s3Res.req.url.indexOf(audioInfo[l].s3Path) >= 0) {
                                  audioInfo[l].isSaved.s3 = true;

                                  console.log("adding job to sns/sqs ingestion queue: "+audioInfo[l].audio_id);
                                  audioInfo[l].measured_at = audioInfo[l].measured_at.toISOString();
                                  
                                  aws.sns().publish({
                                      TopicArn: aws.snsTopicArn("rfcx-analysis"),
                                      Message: JSON.stringify(audioInfo[l])
                                    }, function(err, data) {
                                      if (!!err) {
                                        console.log(err);
                                      } else {
                                        var isComplete = true, 
                                          returnJson = {
                                            checkin_id: audioInfo[l].checkin_id,
                                            audio: []
                                          };
                                        for (m in audioInfo) {
                                          if (!audioInfo[m].isSaved.sqs) { isComplete = false; }
                                          returnJson.audio.push({
                                            id: m,
                                            guid: audioInfo[m].audio_id
                                          });         
                                        }
                                        if (isComplete) {
                                          if (verbose_logging) { console.log(returnJson); }
                                          res.status(200).json(returnJson);
                                          for (m in audioInfo) { audioInfo[m].isSaved.sqs = false; }
                                        }
                                      }
                                  });
                                  fs.unlink(audioInfo[l].localPath,function(e){if(e){console.log(e);}});
                                  audioInfo[l].isSaved.sqs = true;
                                }
                              }
                            }
                        });
                      }
                    }
                  }).catch(function(err){
                    console.log("error adding audio to database | "+err);
                    if (!!err) { res.status(500).json({msg:"error adding audio to database"}); }
                  });
                }
              } else {
                console.log("couldn't match audio meta to uploaded content | "+audioMeta);
                if (!!err) { res.status(500).json({msg:"couldn't match audio meta to uploaded content"}); }
              }
            } else {
              console.log("no audio files detected");
              res.status(200).json(dbCheckIn);
            }
          }).catch(function(err){
            console.log("error adding checkin to database | "+err);
            if (!!err) { res.status(500).json({msg:"error adding checkin to database"}); }
          });
        }).catch(function(err){
          console.log("failed to update version of guardian | "+err);
          if (!!err) { res.status(500).json({msg:"failed to update version of guardian"}); }
        });
    });
  })
;

router.route("/:guardian_id/checkins/:checkin_id")
  .get(function(req, res) {

    models.Guardian
      .findAll( { where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian){

        res.status(200).json(dbGuardian);
    
    }).catch(function(err){
        console.log("failed to find guardian | "+err);
    });
  })
;

module.exports = router;

// Special Functions

function strArrToAvg(str,delim) {
  if (str == null) { return null; }
  try {
    var ttl = 0, arr = str.split(delim);
    if (arr.length > 0) {
      for (i in arr) { ttl = ttl + parseInt(arr[i]); }
      return Math.round(ttl/arr.length);
    } else {
      return null;
    }
  } catch(e) {
    console.log(e);
    return null;
  }
}


