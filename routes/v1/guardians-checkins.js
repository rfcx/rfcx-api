var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var zlib = require("zlib");
var exifTool = require("exiftool");
var util = require("util");
var hash = require("../../utils/hash.js").hash;
var token = require("../../utils/auth-token.js").token;
var aws = require("../../utils/external/aws.js").aws();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/checkins")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var requestStartTime = (new Date()).valueOf();

    zlib.unzip(
      new Buffer(querystring.parse("gzipped="+req.body.meta).gzipped,"base64"),
      function(zLibError,zLibBuffer){
      if (!zLibError) {

        var json = JSON.parse(zLibBuffer.toString());
        if (verbose_logging) { console.log(json); }
      
        models.Guardian
          .findOne({ 
            where: { guid: req.params.guardian_id }
        }).then(function(dbGuardian){

          dbGuardian.last_check_in = new Date();
          dbGuardian.check_in_count = 1+dbGuardian.check_in_count;
          dbGuardian.save();

          var metaVersionArr = strArrToJSArr(json.software_version,"|","*"), versionJson = {};
          for (vInd in metaVersionArr) { versionJson[metaVersionArr[vInd][0]] = metaVersionArr[vInd][1]; }

          models.GuardianCheckIn
            .create({
              guardian_id: dbGuardian.id,
              site_id: dbGuardian.site_id,
              software_versions: JSON.stringify(versionJson),
              measured_at: new Date(json.measured_at.replace(/ /g,"T")+json.timezone_offset),
              guardian_queued_checkins: parseInt(json.queued_checkins),
              guardian_skipped_checkins: parseInt(json.skipped_checkins),
              location_latitude: 3.6141375, // this needs to be a real values from the guardian, or otherwise...
              location_longitude: 14.2108033, // this needs to be a real values from the guardian, or otherwise...
              is_certified: dbGuardian.is_certified
          }).then(function(dbCheckIn){

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
                }).then(function(dbGuardianMetaDataTransfer){ }).catch(function(err){
                  console.log("failed to create GuardianMetaDataTransfer | "+err);
                });
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
                }).then(function(dbGuardianMetaCPU){ }).catch(function(err){
                  console.log("failed to create GuardianMetaCPU | "+err);
                });
            }

            // save guardian meta battery
            var metaBattery = strArrToJSArr(json.battery,"|","*");
            for (battInd in metaBattery) {
              models.GuardianMetaBattery.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaBattery[battInd][0].replace(/ /g,"T")+json.timezone_offset),
                  battery_percent: parseInt(metaBattery[battInd][1]),
                  battery_temperature: parseInt(metaBattery[battInd][2])
                }).then(function(dbGuardianMetaBattery){ }).catch(function(err){
                  console.log("failed to create GuardianMetaBattery | "+err);
                });
            }

            // save guardian meta power
            var metaPower = strArrToJSArr(json.power,"|","*");
            for (pwrInd in metaPower) {
              models.GuardianMetaPower.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaPower[pwrInd][0].replace(/ /g,"T")+json.timezone_offset),
                  is_powered: (metaPower[pwrInd][1] === "1") ? true : false,
                  is_charged: (metaPower[pwrInd][2] === "1") ? true : false
                }).then(function(dbGuardianMetaPower){ }).catch(function(err){
                  console.log("failed to create GuardianMetaPower | "+err);
                });
            }

            // save guardian meta network
            var metaNetwork = strArrToJSArr(json.network,"|","*");
            for (ntwkInd in metaNetwork) {
              models.GuardianMetaNetwork.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaNetwork[ntwkInd][0].replace(/ /g,"T")+json.timezone_offset),
                  signal_strength: parseInt(metaNetwork[ntwkInd][1]),
                  network_type: metaNetwork[ntwkInd][2],
                  carrier_name: metaNetwork[ntwkInd][3]
                }).then(function(dbGuardianMetaNetwork){ }).catch(function(err){
                  console.log("failed to create GuardianMetaNetwork | "+err);
                });
            }

            // save guardian meta offline periods
            var metaOffline = strArrToJSArr(json.offline,"|","*");
            for (offlInd in metaOffline) {
              models.GuardianMetaOffline.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  ended_at: new Date(metaOffline[offlInd][0].replace(/ /g,"T")+json.timezone_offset),
                  offline_duration: parseInt(metaOffline[offlInd][1]),
                  carrier_name: metaOffline[offlInd][2]
                }).then(function(dbGuardianMetaOffline){ }).catch(function(err){
                  console.log("failed to create GuardianMetaOffline | "+err);
                });
            }

            // save guardian meta light meter
            var metaLightMeter = strArrToJSArr(json.lightmeter,"|","*");
            for (lmInd in metaLightMeter) {
              models.GuardianMetaLightMeter.create({
                  guardian_id: dbGuardian.id,
                  check_in_id: dbCheckIn.id,
                  measured_at: new Date(metaLightMeter[lmInd][0].replace(/ /g,"T")+json.timezone_offset),
                  luminosity: parseInt(metaLightMeter[lmInd][1])
                }).then(function(dbGuardianMetaLightMeter){ }).catch(function(err){
                  console.log("failed to create GuardianMetaLightMeter | "+err);
                });
            }

            // template for json return... to be populated as we progress
            var returnJson = {
              checkin_id: dbCheckIn.guid, // unique guid of the check-in
              audio: [], // array of audio files successfully ingested
              screenshots: [], // array of screenshot images successfully ingested
              messages: [], // array of sms messages successfully ingested
              instructions: {
                prefs: {},
                messages: [] // array of sms messages that the guardian should send
              }
            };

            // parse, review and save sms messages
            if (util.isArray(json.messages)) {
              var messageInfo = {};
              for (msgInd in json.messages) {
                messageInfo[json.messages[msgInd].android_id] = {
                  android_id: json.messages[msgInd].android_id,
                  guid: null,
                  guardian_id: dbGuardian.id,
                  checkin_id: dbCheckIn.id,
                  version: null,//dSoftware.number,
                  address: json.messages[msgInd].address,
                  body: json.messages[msgInd].body,
                  timeStamp: new Date(json.messages[msgInd].received_at.replace(/ /g,"T")+json.timezone_offset),
                  isSaved: false
                };
              }
              for (msgInfoInd in messageInfo) {
                // save each message into a database
                models.GuardianMetaMessage.create({
                    guardian_id: messageInfo[msgInfoInd].guardian_id,
                    check_in_id: messageInfo[msgInfoInd].checkin_id,
                    received_at: messageInfo[msgInfoInd].timeStamp,
                    address: messageInfo[msgInfoInd].address,
                    body: messageInfo[msgInfoInd].body,
                    android_id: messageInfo[msgInfoInd].android_id
                  }).then(function(dbGuardianMetaMessage){
                    // if all goes well, then report it on the "global" object...
                    messageInfo[dbGuardianMetaMessage.android_id].isSaved = true;
                    messageInfo[dbGuardianMetaMessage.android_id].guid = dbGuardianMetaMessage.guid;
                    console.log("message saved: "+dbGuardianMetaMessage.guid);
                  }).catch(function(err){
                    console.log("error saving message: "+messageInfo[msgInfoInd].android_id+", "+messageInfo[msgInfoInd].body+", "+err);
                  });
              }
            }

            // if included, update previous checkIn info
            if (json.previous_checkins != null) {
              var previousCheckIns = strArrToJSArr(json.previous_checkins,"|","*");
              for (prvChkInInd in previousCheckIns) {
                models.GuardianCheckIn
                  .findOne({
                    where: { guid: previousCheckIns[prvChkInInd][0] }
                  }).then(function(dPreviousCheckIn){
                    dPreviousCheckIn.request_latency_guardian = previousCheckIns[prvChkInInd][1];
                    dPreviousCheckIn.save();
                  }).catch(function(err){
                    console.log("error finding/updating previous checkin id: "+previousCheckIns[prvChkInInd][0]);
                  });
              }
            }

            // save screenshot files
            if (!!req.files.screenshot) {
              var screenShotInfo = {};
              if (!util.isArray(req.files.screenshot)) { req.files.screenshot = [req.files.screenshot]; }
                for (i in req.files.screenshot) {
                  // this next line assumes there is only one screenshot attached
                  // ...so this should probably be updated to work like the rest of this section
                  var screenShotMeta = json.screenshots.split("|")[0].split("*");
                  var timeStamp = req.files.screenshot[i].originalname.substr(0,req.files.screenshot[i].originalname.lastIndexOf(".png"));
                  var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");
                  screenShotInfo[timeStamp] = {
                     guardian_id: dbGuardian.guid,
                     checkin_id: dbCheckIn.guid,
                     version: null, // to be decided whether this is important to include here...
                     uploadLocalPath: req.files.screenshot[i].path,
                     size: fs.statSync(req.files.screenshot[i].path).size,
                     sha1Hash: hash.fileSha1(req.files.screenshot[i].path),
                     guardianSha1Hash: screenShotMeta[3],
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

                  if (screenShotInfo[j].sha1Hash === screenShotInfo[j].guardianSha1Hash) {

                    aws.s3("rfcx-meta").putFile(
                      screenShotInfo[j].uploadLocalPath, screenShotInfo[j].s3Path, 
                      function(err, s3Res){
                        s3Res.resume();
                        if (!!err) {
                          console.log(err);
                        } else if (200 == s3Res.statusCode) {
                          for (l in screenShotInfo) {
                            if (s3Res.req.url.indexOf(screenShotInfo[l].s3Path) >= 0) {
                              screenShotInfo[l].isSaved = true;
                              console.log("screenshot saved: "+screenShotInfo[l].timeStamp);
                              fs.unlink(screenShotInfo[l].uploadLocalPath,function(e){if(e){console.log(e);}});
                            }
                          }                        
                        }
                    });

                  } else {
                    // even if checksum fails, we still (at least for now) want
                    // to instruct to the guardian to delete the screenshot and move on
                    screenShotInfo[j].isSaved = true;
                    fs.unlink(screenShotInfo[j].uploadLocalPath,function(e){if(e){console.log(e);}});
                  }

                }
            }

            // add prefs instructions as set in database
            for (guardianInd in dbGuardian.dataValues) {
              if ((guardianInd.substr(0,6) === "prefs_") && (dbGuardian.dataValues[guardianInd] != null)) {
                returnJson.instructions.prefs[guardianInd.substr(6)] = dbGuardian.dataValues[guardianInd];
              }
            }

            // add messages instructions
            // returnJson.instructions.messages.push({
            //   body: "Testing "+dbCheckIn.guid,
            //   address: "+14153359205",
            //   guid: "guid goes here"
            // });
            
            var softwareVersions = [];
            for (versionInd in versionJson) { softwareVersions.push(versionInd+"-"+versionJson[versionInd]); }
            console.log("check-in: "+dbCheckIn.guid+", "
                        +"guardian: "+dbGuardian.guid+", "
                        +"version: "+softwareVersions.join(", ")
                        );


            // save audio files
            if (!!req.files.audio) {
              if (!util.isArray(req.files.audio)) { req.files.audio = [req.files.audio]; }
              var audioMeta = [];
              if (json.audio != null) { audioMeta = json.audio.split("|"); }
              if (audioMeta.length == req.files.audio.length) {
                var audioInfo = {};
                for (i in req.files.audio) {
                  audioMeta[i] = audioMeta[i].split("*");
                  var timeStamp = audioMeta[i][1]; 
                  audioMeta[i][1] = new Date(parseInt(audioMeta[i][1]));
                  var dateString = audioMeta[i][1].toISOString().substr(0,19).replace(/:/g,"-");
                  audioInfo[timeStamp] = {
                    guardian_id: dbGuardian.guid,
                    checkin_id: dbCheckIn.guid,
                    version: null, // to be decided whether this is important to include here...
                    battery_temperature: null,
                    guardianSha1Hash: audioMeta[i][3],
                    uploadLocalPath: req.files.audio[i].path,
                    unzipLocalPath: req.files.audio[i].path.substr(0,req.files.audio[i].path.lastIndexOf("."))+"."+audioMeta[i][2],
                    size: null, // to be calculated following the uncompression
                    sha1Hash: null, // to be calculated following the uncompression
                    duration: null,
                    timeStamp: timeStamp,
                    measured_at: audioMeta[i][1],
                    api_token_guid: null,
                    api_token: null,
                    api_token_expires: null,
                    isSaved: { db: false, s3: false, sqs: false },
                    s3Path: "/"+process.env.NODE_ENV
                            +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                            +"/"+dbGuardian.guid
                            +"/"+dbGuardian.guid+"-"+dateString+"."+audioMeta[i][2]
                  };
                }

                for (j in audioInfo) {
                  
                  // unzip uploaded audio file into upload directory
                  audioInfo[j].unZipStream = fs.createWriteStream(audioInfo[j].unzipLocalPath);
                  fs.createReadStream(audioInfo[j].uploadLocalPath).pipe(zlib.createGunzip()).pipe(audioInfo[j].unZipStream);
                  // when the output stream closes, proceed asynchronously...
                  audioInfo[j].unZipStream.on("close", function(){
                    // fill in the file info on the unzipped audio file
                    audioInfo[j].sha1Hash = hash.fileSha1(audioInfo[j].unzipLocalPath);
                    audioInfo[j].size = fs.statSync(audioInfo[j].unzipLocalPath).size;
                    // compare to checksum received from guardian
                    if (audioInfo[j].sha1Hash === audioInfo[j].guardianSha1Hash) {

                      // if it matches, add the audio to the database
                      models.GuardianAudio.create({
                        guardian_id: dbGuardian.id,
                        site_id: dbGuardian.site_id,
                        check_in_id: dbCheckIn.id,
                        sha1_checksum: audioInfo[j].sha1Hash,
                        url: "s3://rfcx-ark"+audioInfo[j].s3Path,
                        size: audioInfo[j].size,
                        duration: audioInfo[j].duration,
                        measured_at: audioInfo[j].measured_at
                      }).then(function(dbAudio){
                        // because the callback is asynchronous...
                        // cycle through all uploaded audio options and match the checksum
                        // ...in order to re-find our place
                        for (k in audioInfo) {
                          if (audioInfo[k].sha1Hash === dbAudio.sha1_checksum) {

                            // parse exif data from file and save to db
                            fs.readFile(audioInfo[k].unzipLocalPath,function(err,audioFileData){
                              if (!!err) { throw err;
                              } else {
                                exifTool.metadata(audioFileData,function(err,audioFileExifData){
                                  if (!!err) { throw err;
                                  } else {
                                    dbAudio.duration = (((parseInt(audioFileExifData.duration.split(":")[0])*3600)+(parseInt(audioFileExifData.duration.split(":")[1])*60)+parseInt(audioFileExifData.duration.split(":")[2]))*1000);
                                    dbAudio.capture_format = audioFileExifData.audioFormat;
                                    dbAudio.capture_bitrate = Math.round(parseFloat(audioFileExifData.avgBitrate.substr(0,audioFileExifData.avgBitrate.indexOf(" kbps")))*1000/128)*128;
                                    dbAudio.capture_sample_rate = parseInt(audioFileExifData.audioSampleRate);
                                    dbAudio.save();
                                  }
                                });
                              }
                            });
                            
                            // inform other async processes that this one has been saved to database
                            audioInfo[k].isSaved.db = true;
                            audioInfo[k].audio_id = dbAudio.guid;

                            aws.s3("rfcx-ark").putFile(
                              audioInfo[k].unzipLocalPath, audioInfo[k].s3Path, 
                              function(err, s3Res){
                                s3Res.resume();
                                if (!!err) {
                                  console.log(err);
                                } else if (200 == s3Res.statusCode) {
                                  for (l in audioInfo) {
                                    if (s3Res.req.url.indexOf(audioInfo[l].s3Path) >= 0) {
                                      audioInfo[l].isSaved.s3 = true;

                                      audioInfo[l].measured_at = audioInfo[l].measured_at.toISOString();
                                      
                                      token.createAnonymousToken({
                                        reference_tag: audioInfo[l].audio_id,
                                        token_type: "worker-analysis",
                                        created_by: "guardian-checkin",
                                        minutes_until_expiration: 20,
                                        allow_garbage_collection: true,
                                        only_allow_access_to: [
                                          "^/v1/guardians/"+audioInfo[l].guardian_id+"/checkins/"+audioInfo[l].checkin_id+"/audio/"+audioInfo[l].audio_id+"/events$"
                                          ]
                                      }).then(function(tokenInfo){

                                        for (m in audioInfo) {
                                          if (audioInfo[m].audio_id == tokenInfo.reference_tag) {

                                            audioInfo[m].api_token_guid = tokenInfo.token_guid;
                                            audioInfo[m].api_token = tokenInfo.token;
                                            audioInfo[m].api_token_expires = tokenInfo.token_expires_at;

                                            aws.sns().publish({
                                                TopicArn: aws.snsTopicArn("rfcx-analysis"),
                                                Message: JSON.stringify({
                                                    guardian_id: audioInfo[m].guardian_id,
                                                    checkin_id: audioInfo[m].checkin_id,
                                                    audio_id: audioInfo[m].audio_id,
                                                    sha1Hash: audioInfo[m].sha1Hash,
                                                    latLng: [ dbCheckIn.location_latitude, dbCheckIn.location_longitude ],
                                                    timeStamp: audioInfo[m].timeStamp,
                                                    measured_at: audioInfo[m].measured_at,
                                                    api_token_guid: audioInfo[m].api_token_guid,
                                                    api_token: audioInfo[m].api_token,
                                                    api_token_expires: audioInfo[m].api_token_expires,
                                                    audioUrl: aws.s3SignedUrl("rfcx-ark", audioInfo[m].s3Path, 30),
                                                    s3Path: audioInfo[m].s3Path
                                                  })
                                              }, function(snsErr, snsData) {

                                                if (!!snsErr) {
                                                  console.log(snsErr);
                                                } else {

                                                  console.log("audio: "+audioInfo[l].audio_id+" (sqs: "+snsData.MessageId+")");

                                                  dbAudio.analysis_aws_queue_id = snsData.MessageId;
                                                  
                                                  var isComplete = true;

                                                  for (n in audioInfo) {
                                                    if (!audioInfo[n].isSaved.sqs) { isComplete = false; }
                                                    returnJson.audio.push({
                                                      id: n,
                                                      guid: audioInfo[n].audio_id
                                                    });         
                                                  }
                                                  for (o in screenShotInfo) {
                                                    if (screenShotInfo[o].isSaved) {
                                                      returnJson.screenshots.push({
                                                        id: o,
                                                        guid: null
                                                      });
                                                    }         
                                                  }
                                                  for (p in messageInfo) {
                                                    if (messageInfo[p].isSaved) {
                                                      returnJson.messages.push({
                                                        id: messageInfo[p].android_id,
                                                        guid: messageInfo[p].guid
                                                      });
                                                    }         
                                                  }
                                                  if (isComplete) {

                                                    dbCheckIn.request_latency_api = (new Date()).valueOf()-requestStartTime;
                                                    dbCheckIn.save();

                                                    if (verbose_logging) { console.log(returnJson); }
                                                    res.status(200).json(returnJson);
                                                    
                                                    for (q in audioInfo) { audioInfo[q].isSaved.sqs = false; }
                                                  }
                                                }
                                            });
                                            fs.unlink(audioInfo[m].uploadLocalPath,function(e){if(e){console.log(e);}});
                                            fs.unlink(audioInfo[m].unzipLocalPath,function(e){if(e){console.log(e);}});
                                            audioInfo[m].isSaved.sqs = true;

                                          }  
                                        }
                                      }).catch(function(err){
                                        console.log("error creating access token for analysis worker | "+err);
                                        dbCheckIn.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
                                        dbAudio.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
                                        if (!!err) { res.status(500).json({msg:"error creating access token for analysis worker"}); }
                                      });
                                    }
                                  }
                                }
                            });
                          }
                        }
                      }).catch(function(err){
                        console.log("error adding audio to database | "+err);
                        dbCheckIn.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
                        if (!!err) { res.status(500).json({msg:"error adding audio to database"}); }
                      });
                    } else {
                      console.log("checksum mismatch on uploaded (and unzipped) audio file | "+audioInfo[j].sha1Hash + " - " + audioInfo[j].guardianSha1Hash);
                      dbCheckIn.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
                      res.status(500).json({msg:"checksum mismatch on uploaded audio file | "+audioInfo[j].sha1Hash + " - " + audioInfo[j].guardianSha1Hash});
                    }
                  });
                }
              } else {
                console.log("couldn't match audio meta to uploaded content | "+audioMeta);
                dbCheckIn.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
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
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(404).json({msg:"failed to find guardian"}); }
      });
    } else {
      console.log("failed to parse gzipped json | "+zLibError);
      if (!!zLibError) { res.status(500).json({msg:"failed to parse gzipped json"}); }
    }
    });
  })
;

router.route("/:guardian_id/checkins/latest")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        models.GuardianCheckIn
          .findAll({ 
            where: { guardian_id: dbGuardian.id }, 
            include: [ { all: true } ], 
            order: [ ["measured_at", "DESC"] ],
            limit: req.rfcx.count
          }).then(function(dbCheckIn){
            
            res.status(200).json(views.models.guardianCheckIns(req,res,dbCheckIn));

          }).catch(function(err){
            console.log("failed to return checkin | "+err);
            if (!!err) { res.status(500).json({msg:"failed to find checkin reference"}); }
          });

      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;

module.exports = router;

// Special Functions

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


