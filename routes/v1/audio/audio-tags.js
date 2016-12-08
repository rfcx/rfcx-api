var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var passport = require("passport");
var analysisUtils = require("../../../utils/rfcx-analysis/analysis-queue.js").analysisUtils;

passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:audio_id/tags")
  .post(passport.authenticate("token",{session:false}), function(req, res) {

    // models.Guardian
    //   .findOne( { where: { guid: req.params.guardian_id } })
    //   .then(function(dbGuardian){

    //     models.GuardianCheckIn
    //       .findOne( { where: { guid: req.params.checkin_id } })
    //       .then(function(dbCheckIn){

            models.GuardianAudio
              .findOne( { where: { guid: req.params.audio_id } })
              .then(function(dbAudio){
                  
                var analysisResults = JSON.parse(req.body.json);

                models.AudioAnalysisModel
                  .findOne( { where: { guid: analysisResults.model } })
                  .then(function(dbModel){

                    if (analysisResults.results.length > 0) {

                      var preInsertGuardianAudioTags = [];
                        var eventBeginsAt = dbAudio.measured_at;
                        var eventEndsAt = dbAudio.measured_at;
                        // contains all probabilities for the model
                      var probabilityVector = [];
                      var cognitionValue = "";

                      for (wndwInd in analysisResults.results) {
                        var currentWindow = analysisResults.results[wndwInd];

                        var beginsAt = new Date((dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[0])));
                        var endsAt = new Date((dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[1])));
                          if(endsAt > eventEndsAt){
                              eventEndsAt = endsAt;
                          }


                        for (tagName in currentWindow.classifications) {

//                          if (currentWindow.classifications[tagName] > 0.5) {
                          if (tagName.toLowerCase() != "ambient") {
                              var probability =  currentWindow.classifications[tagName];
                            cognitionValue = tagName;

                            preInsertGuardianAudioTags.push({
                              type: "classification",
                              value: tagName,
                              confidence: probability,
                              begins_at: beginsAt,
                              ends_at: endsAt,
                              begins_at_offset: currentWindow.window[0],
                              ends_at_offset: currentWindow.window[1],
                              audio_id: dbAudio.id,
                              tagged_by_model: dbModel.id
                            });
                              probabilityVector.push( probability );

                          }

                        }

                      }

                    models.GuardianAudioTag
                      .bulkCreate(preInsertGuardianAudioTags)
                        .then(function () {
                            // queue up cognition analysis
                            // current we only support window-count analysis method
                            // Todo: this code will be deleted and live in an own cognition layer application/env

                            var cognitionParmas = {
                                analysis_method: "window-count",
                                params:  {
                                    min_max_windows: [
                                        // -1 = infinity
                                        [dbModel.minimal_detected_windows, -1]
                                    ],
                                    min_max_probability: [
                                        // 1.0 = max prob
                                        [dbModel.minimal_detection_confidence, 1.0]
                                    ]
                                },
                                data: [ probabilityVector ],
                                cognition_type: "event",
                                cognition_value: cognitionValue
                            };


                            var createdEvent = {
                                type: dbModel.event_type,
                                value: dbModel.event_value,
                                begins_at: eventBeginsAt,
                                ends_at: eventEndsAt,
                                audio_id: req.params.audio_id

                            };
                            
                            var options = {
                                api_url_domain: req.rfcx.api_url_domain
                            };


                            analysisUtils.queueForCognitionAnalysis("rfcx-cognition", createdEvent, cognitionParmas, options);


                        })
                      .then(function(){
                        res.status(200).json([]);
                      }).catch(function(err){
                        console.log("failed to save analysis windows | "+err);
                        if (!!err) { res.status(500).json({msg:"failed to save analysis windows"}); }
                      });
                        
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

      //     }).catch(function(err){
      //       console.log("failed to find checkIn reference | "+err);
      //       if (!!err) { res.status(404).json({ message: "failed to find checkIn reference", error: { status: 404 } }); }
      //     });

      // }).catch(function(err){
      //   console.log("failed to find guardian reference | "+err);
      //   if (!!err) { res.status(404).json({ message: "failed to find guardian reference", error: { status: 404 } }); }
      // });

  })
;


module.exports = router;



