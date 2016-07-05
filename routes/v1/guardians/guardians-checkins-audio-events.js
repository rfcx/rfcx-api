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
                  
                var analysisResults = JSON.parse(req.body.json);

                models.AudioAnalysisModel
                  .findOne( { where: { shortname: analysisResults.model } })
                  .then(function(dbModel){

                    if (analysisResults.results.length > 0) {
                      
                      var processedWindows = 0, savedClassifications = [];

                      for (wndwInd in analysisResults.results) {
                        var currentWindow = analysisResults.results[wndwInd];

                        var beginsAt = new Date((dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[0])));
                        var endsAt = new Date((dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[1])));

                        for (classification in currentWindow.classifications) {

                          if (currentWindow.classifications[classification][0] > 0) {

                            models.GuardianAudioTag.create({
                              type: "classification",
                              value: classification,
                              confidence: currentWindow.classifications[classification][0],
                              begins_at: beginsAt,
                              ends_at: endsAt,
                              begins_at_offset: currentWindow.window[0],
                              ends_at_offset: currentWindow.window[1],
                              audio_id: dbAudio.id,
                              tagged_by_model: dbModel.id
                            }).then(function(dbGuardianAudioTag){

                              savedClassifications.push(dbGuardianAudioTag.guid);
                              processedWindows++;

                              if (processedWindows == analysisResults.results.length) {
                                res.status(200).json(savedClassifications);
                              }

                            }).catch(function(err){
                              console.log("failed to create classification tag | "+err);
                              res.status(500).json({msg:"failed to create classification tag"});
                            });
                          } else {
                            processedWindows++;
                          }
                        }

                      }
                        
                    } else {
                      res.status(200).json([]);
                    }

                }).catch(function(err){
                  console.log("failed to find model reference | "+err);
                  if (!!err) { res.status(404).json({ message: "failed to find model reference", error: { status: 500 } }); }
                });

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



