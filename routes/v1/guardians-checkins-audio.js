var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

router.route("/:guardian_id/checkins/:checkin_id/audio/:audio_id")
  .post(function(req, res) {

    models.Guardian
      .findOne( { where: { guid: req.params.guardian_id } })
      .then(function(dbGuardian){

        // models.GuardianCheckIn
        //   .findOne( { where: { guid: req.params.checkin_id } })
        //   .then(function(dbCheckIn){

        //   console.log("checkin: "+dbCheckIn.guid);

        //     models.GuardianAudio
        //       .findOne( { where: { guid: req.params.audio_id } })
        //       .then(function(dbAudio){
                

        //         console.log("audio: "+dbAudio.guid);

        //         dbAudio.analyzed_at = new Date();
        //         dbAudio.analysis_sqs_msg_id = null; // need to add real sqs id once it gets added/sent to/from the analysis script request logic
        //         dbAudio.save();

                    // This is not ideal... currently the python-based analysis sends a JSON array of detected events
                    // in a separate text file. This file must thereby be downloaded into the temporary uploads directory
                    // and then opened, parsed, and deleted afterward. It would obviously be better to have this same
                    // JSON array sent along as a string in a POST field instead.
                    fs.readFile(req.files.json.path, 'utf8', function(readFileError, data) {
                      if (readFileError) throw readFileError;
                      var audioEvents = JSON.parse(data);
 //                     console.log(audioEvents);

                      if (audioEvents.length > 0) {
                        console.log(audioEvents.length+" events to be saved...");
                        models.GuardianAudio
                          .findAll({ 
                            where: { 
                              guardian_id: dbGuardian.id, 
                              measured_at: new Date(audioEvents[0].recording_start) 
                            }, limit: 1
                          }).spread(function(dbGuardianAudio){

                            if (dbGuardianAudio.id != null) {

                              for (eventInd in audioEvents) {
                                var audioEvent = audioEvents[eventInd];
                                var eventTime = new Date(audioEvent.incident_time.replace(/ /g,"T")+".000Z");
                                var audioStartTime = new Date(audioEvent.recording_start);
                                var audioEventTime = eventTime.valueOf()-audioStartTime.valueOf();

                                // these aren't correctly used for now...
                                var incidentKey = audioEvent.audio_id.substr(audioEvent.audio_id.indexOf("-")+1);

                                models.GuardianEvent
                                  .findOrCreate({ where: { 
                                    guardian_id: dbGuardian.id, 
                                    guardian_audio_id: dbGuardianAudio.id, 
                                    measured_at: eventTime, 
                                    classification: audioEvent.snd_classification, 
                                    duration: Math.round(parseFloat(audioEvent.incident_duration)*1000),
                                    incident_key: incidentKey, 
                                    service_key: null
                                  } })
                                  .spread(function(dbGuardianEvent, wasCreated){



                                  }).catch(function(err){
                                    console.log("failed to find or create event | "+err);
                             //       if (!!err) { res.status(200).json({msg:"failed to find or create event"}); }
                                  });

                              }
                            }

                        }).catch(function(err){
                          console.log("failed to find audio by timing and guardian | "+err);
                  //        if (!!err) { res.status(200).json({msg:"failed to find audio by timing and guardian"}); }
                        });

                      }

                      fs.unlink(req.files.json.path,function(e){if(e){console.log(e);}});
                      res.status(200).json({msg:"done"});
                    });

          //     }).catch(function(err){
          //       console.log("failed to find audio reference | "+err);
          //       if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
          //     });

          // }).catch(function(err){
          //   console.log("failed to find checkIn reference | "+err);
          //   if (!!err) { res.status(500).json({msg:"failed to find checkIn reference"}); }
          // });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian reference"}); }
      });

  })
;



module.exports = router;



