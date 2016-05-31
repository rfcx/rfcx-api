var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/checkins/:checkin_id/audio/:audio_id/events")
  .post(passport.authenticate("token",{session:false}), function(req, res) {

    models.Guardian
      .findOne( { where: { guid: req.params.guardian_id } })
      .then(function(dbGuardian){

        models.GuardianCheckIn
          .findOne( { where: { guid: req.params.checkin_id } })
          .then(function(dbCheckIn){

            models.GuardianAudio
              .findOne( { where: { guid: req.params.audio_id } })
              .then(function(dbAudio){

                dbAudio.analyzed_at = new Date();
                dbAudio.save();
                  
                var audioEvents = JSON.parse(req.body.json);

                if (audioEvents.length > 0) {
                  var savedEvents = [];
                  for (eventInd in audioEvents) {
                    var audioEvent = audioEvents[eventInd];
                    var eventTime = new Date((dbAudio.measured_at.valueOf()+parseInt(audioEvent.begins_at)));
                    var fingerprintArray = JSON.stringify(audioEvent.fingerprint);
                    
                    models.GuardianEvent
                      .create({
                        guardian_id: dbGuardian.id, 
                        check_in_id: dbCheckIn.id, 
                        audio_id: dbAudio.id, 
                        site_id: dbGuardian.site_id,
                        begins_at_analysis: eventTime, 
                        begins_at_reviewer: null,
                        duration_analysis: parseInt(audioEvent.duration),
                        duration_reviewer: null,
                        classification_analysis: audioEvent.classification, 
                        classification_reviewer: null,
                        latitude: null,
                        longitude: null,
                        fingerprint: fingerprintArray
                      }).then(function(dbGuardianEvent){

                        savedEvents.push(dbGuardianEvent.guid);
                        if (savedEvents.length == audioEvents.length) {
                          res.status(200).json(savedEvents);
                        }

                      }).catch(function(err){
                        console.log("failed to create event | "+err);
                        res.status(500).json({msg:"failed to create event"});
                      });
                  }
                } else {
                  res.status(200).json([]);
                }

              }).catch(function(err){
                console.log("failed to find audio reference | "+err);
                if (!!err) { res.status(404).json({ message: "failed to find audio reference", error: { status: 404 } }); }
              });

          }).catch(function(err){
            console.log("failed to find checkIn reference | "+err);
            if (!!err) { res.status(404).json({ message: "failed to find checkIn reference", error: { status: 404 } }); }
          });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(404).json({ message: "failed to find guardian reference", error: { status: 404 } }); }
      });

  })
;


module.exports = router;



