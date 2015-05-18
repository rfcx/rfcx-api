var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var util = require("util");
var hash = require("../../misc/hash.js").hash;
var aws = require("../../config/aws.js").aws();

router.route("/:guardian_id/checkins")
  .post(function(req, res) {

    var requestStartTime = (new Date()).valueOf();

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
            network_search_time: strArrToAvg(json.network_search_time,"|","*"),
            internal_luminosity: strArrToAvg(json.internal_luminosity,"|","*"),
            network_transmit_time: null,
            measured_at: new Date(json.measured_at.replace(/ /g,"T")+json.timezone_offset)
          }).then(function(dbCheckIn){
            console.log("check-in created: "+dbCheckIn.guid);

            // save guardian meta data

            // save guardian meta data transfer
            var metaDataTransfer = strArrToJSArr(json.data_transfer,"|","*");
            for (dtInd in metaDataTransfer) {
              models.GuardianMetaDataTransfer.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  started_at: new Date(metaDataTransfer[dtInd][0].replace(/ /g,"T")+json.timezone_offset),
                  ended_at: new Date(metaDataTransfer[dtInd][1].replace(/ /g,"T")+json.timezone_offset),
                  bytes_received: parseInt(metaDataTransfer[dtInd][2]),
                  bytes_sent: parseInt(metaDataTransfer[dtInd][3]),
                  total_bytes_received: parseInt(metaDataTransfer[dtInd][4]),
                  total_bytes_sent: parseInt(metaDataTransfer[dtInd][5])
                }).then(function(dbGuardianMetaDataTransfer){ }).catch(function(err){ });
            }

            // save guardian meta CPU
            var metaCPU = strArrToJSArr(json.cpu,"|","*");
            for (cpuInd in metaCPU) {
              models.GuardianMetaCPU.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaCPU[cpuInd][0].replace(/ /g,"T")+json.timezone_offset),
                  cpu_percent: parseInt(metaCPU[cpuInd][1]),
                  cpu_clock: parseInt(metaCPU[cpuInd][2])
                }).then(function(dbGuardianMetaCPU){ }).catch(function(err){ });
            }

            // save guardian meta battery
            var metaBattery = strArrToJSArr(json.cpu,"|","*");
            for (battInd in metaBattery) {
              models.GuardianMetaBattery.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaBattery[battInd][0].replace(/ /g,"T")+json.timezone_offset),
                  battery_percent: parseInt(metaBattery[battInd][1]),
                  battery_temperature: parseInt(metaBattery[battInd][2])
                }).then(function(dbGuardianMetaBattery){ }).catch(function(err){ });
            }

            var returnJson = {
              checkin_id: dbCheckIn.guid,
              audio: [],
              screenshots: [],
              messages: [],
              instructions: {
                prefs: {},
                messages: []
              }
            };

            // parse, review and save sms messages
            var messages = JSON.parse(querystring.parse("all="+req.body.messages).all);
            if (util.isArray(messages)) {
              console.log(messages.length + " messages to store...");
              var messageInfo = {};
              for (msgInd in messages) {
                var digest = messages[msgInd].digest;
                messageInfo[digest] = {
                     guardian_id: dbGuardian.guid,
                     checkin_id: dbCheckIn.guid,
                     version: dSoftware.number,
                     digest: messages[msgInd].digest,
                     number: messages[msgInd].number,
                     body: messages[msgInd].body,
                     timeStamp: new Date(parseInt(messages[msgInd].received_at)),
                     isSaved: false
                  };
              }
              for (msgInfoInd in messageInfo) {
                // ... save the messages into a database
                // if all goes well, then...
                messageInfo[msgInfoInd].isSaved = true;
                console.log("message saved: "+messageInfo[msgInfoInd].timeStamp);
              }
            }

            // if included, update previous checkIn info
            if (json.previous_checkins != null) {
              var previousCheckIns = json.previous_checkins.split("|"); 
              for (checkInIndex in previousCheckIns) {
                var previousCheckIn = previousCheckIns[checkInIndex].split("*");
                models.GuardianCheckIn
                  .findAll({ where: { guid: previousCheckIn[0] } })
                  .spread(function(dPreviousCheckIn){
                    dPreviousCheckIn.request_latency_guardian = previousCheckIn[1];
                    dPreviousCheckIn.save();
                  }).catch(function(err){
                    console.log("error finding/updating previous checkin id: "+previousCheckIn[0]);
                  });
              }
            }

            // save screenshot files
            if (!!req.files.screenshot) {
              if (!util.isArray(req.files.screenshot)) { req.files.screenshot = [req.files.screenshot]; }
                console.log(req.files.screenshot.length + " screenshot files to ingest...");
                var screenShotInfo = {};
                for (i in req.files.screenshot) {
                  var timeStamp = req.files.screenshot[i].originalname.substr(0,req.files.screenshot[i].originalname.lastIndexOf(".png"));
                  var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");
                  screenShotInfo[timeStamp] = {
                     guardian_id: dbGuardian.guid,
                     checkin_id: dbCheckIn.guid,
                     version: dSoftware.number,
                     sha1Hash: hash.fileSha1(req.files.screenshot[i].path),
                     localPath: req.files.screenshot[i].path,
                     size: fs.statSync(req.files.screenshot[i].path).size,
                     origin_id: timeStamp,
                     timeStamp: new Date(parseInt(timeStamp)),
                     isSaved: false,
                     s3Path: "/"+process.env.NODE_ENV
                              +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                              +"/"+dbGuardian.guid
                              +"/"+dbGuardian.guid+"-"+dateString+".png"
                  };

                }
                for (j in screenShotInfo) {
                  aws.s3("rfcx-meta").putFile(
                    screenShotInfo[j].localPath, screenShotInfo[j].s3Path, 
                    function(err, s3Res){
                      s3Res.resume();
                      if (!!err) {
                        console.log(err);
                      } else if (200 == s3Res.statusCode) {
                        for (l in screenShotInfo) {
                          if (s3Res.req.url.indexOf(screenShotInfo[l].s3Path) >= 0) {
                            screenShotInfo[l].isSaved = true;
                            console.log("screenshot saved: "+screenShotInfo[l].timeStamp);
                          }
                        }                        
                      }
                  });
                }
            }

            // save audio files
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
                  var dateString = audioMeta[i][1].toISOString().substr(0,19).replace(/:/g,"-");
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
                            +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                            +"/"+dbGuardian.guid
                            +"/"+dbGuardian.guid+"-"+dateString
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
                                        var isComplete = true;
                                          
                                        for (m in audioInfo) {
                                          if (!audioInfo[m].isSaved.sqs) { isComplete = false; }
                                          returnJson.audio.push({
                                            id: m,
                                            guid: audioInfo[m].audio_id
                                          });         
                                        }
                                        for (n in screenShotInfo) {
                                          if (screenShotInfo[n].isSaved) {
                                            returnJson.screenshots.push({
                                              id: n,
                                              guid: null
                                            });
                                          }         
                                        }
                                        for (o in messageInfo) {
                                          if (messageInfo[o].isSaved) {
                                            returnJson.messages.push({
                                              digest: messageInfo[o].digest,
                                              guid: null
                                            });
                                          }         
                                        }
                                        if (isComplete) {

                                          dbCheckIn.request_latency_api = (new Date()).valueOf()-requestStartTime;
                                          dbCheckIn.save();

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
              dbCheckIn.request_latency_api = (new Date()).valueOf()-requestStartTime;
              dbCheckIn.save();
              res.status(200).json(returnJson);
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

function strArrToAvg(str,delimA,delimB) {
  if (str == null) { return null; }
  try {
    var ttl = 0, arr = str.split(delimA);
    if (arr.length > 0) {
      for (i in arr) {
        ttl = ttl + parseInt(arr[i].split(delimB)[1]);
      }
      return Math.round(ttl/arr.length);
    } else {
      return null;
    }
  } catch(e) {
    console.log(e);
    return null;
  }
}

function strArrToJSArr(str,delimA,delimB) {
  if (str == null) { return []; }
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


