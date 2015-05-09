var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");

router.route("/:guardian_id/checkins/:checkin_id/audio/:audio_id")
  .post(function(req, res) {

    models.Guardian
      .findOne( { where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian){

        models.GuardianCheckIn
          .findOne( { where: { guid: req.params.checkin_id } })
          .spread(function(dbCheckIn){

            models.GuardianAudio
              .findOne( { where: { guid: req.params.audio_id } })
              .spread(function(dbAudio){
                
                dbAudio.analyzed_at = new Date();
                dbAudio.analysis_sqs_msg_id = null; // need to add real sqs id once it gets added/sent to/from the analysis script request logic
                dbAudio.save();

                    // This is not ideal... currently the python-based analysis sends a JSON array of detected events
                    // in a separate text file. This file must thereby be downloaded into the temporary uploads directory
                    // and then opened, parsed, and deleted afterward. It would obviously be better to have this same
                    // JSON array sent along as a string in a POST field instead.
                    fs.readFile(req.files.json.path, 'utf8', function(readFileError, data) {
                      if (readFileError) throw readFileError;
                      var events = JSON.parse(data);
                      if (events.length > 0) {
                          for (eventInd in events) {
                            var event = audioEvents[eventInd];
                            var eventTime = new Date(event.incident_time.replace(/ /g,"T")+".000Z");
                            var audioStartTime = new Date(event.recording_start);
                            var audioEventTime = eventTime.valueOf()-audioStartTime.valueOf();
                          }
                      }
                      fs.unlink(req.files.json.path,function(e){if(e){console.log(e);}});
                    });

              }).catch(function(err){
                console.log("failed to find audio reference | "+err);
                if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
              });

          }).catch(function(err){
            console.log("failed to find checkIn reference | "+err);
            if (!!err) { res.status(500).json({msg:"failed to find checkIn reference"}); }
          });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian reference"}); }
      });

  })
;



module.exports = router;



