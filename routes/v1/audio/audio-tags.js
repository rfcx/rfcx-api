var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var passport = require("passport");
var httpError = require("../../../utils/http-errors.js");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:audio_id/tags")
  .post(passport.authenticate("token",{session:false}), function(req, res) {

    var analysisResults;

    try {
      analysisResults = JSON.parse(req.body.json);
    }
    catch (e) {
      return httpError(res, 400, null, 'Failed to parse json data');
    }

    if (!analysisResults.results || !analysisResults.results.length) {
      return httpError(res, 400, null, 'Request payload doesn\'t contain tags');
    }

    return models.GuardianAudio
      .findOne( { where: { guid: req.params.audio_id } })
      .bind({})
      .then(function(dbAudio) {
        if (!dbAudio) {
          throw new Error('Audio with given guid not found');
        }
        this.dbAudio = dbAudio;
        return models.AudioAnalysisModel.findOne({where: {guid: analysisResults.model}});
      })
      .then(function(dbModel){
        if (!dbModel) {
          throw new Error('Model with given guid not found');
        }
        this.dbModel = dbModel;

        var removePromises = [];

        // if model has already classified this file, then remove all previous tags
        for (var wndwInd in analysisResults.results) {
          if (analysisResults.results.hasOwnProperty(wndwInd)) {
            var currentWindow = analysisResults.results[wndwInd];

            for (var tagName in currentWindow.classifications) {
              if (currentWindow.classifications.hasOwnProperty(tagName)) {
                if (tagName.toLowerCase() !== "ambient") {

                  var promise = models.GuardianAudioTag
                    .destroy({
                      where: {
                        audio_id: this.dbAudio.id,
                        type: 'classification',
                        value: tagName,
                        tagged_by_model: dbModel.id
                      }
                    });
                  removePromises.push(promise);
                }
              }
            }

          }
        }

        return Promise.all(removePromises);
      })
      .then(function() {

        var preInsertGuardianAudioTags = [];

        for (var wndwInd in analysisResults.results) {

          if (analysisResults.results.hasOwnProperty(wndwInd)) {

            var currentWindow = analysisResults.results[wndwInd];

            var beginsAt = new Date((this.dbAudio.measured_at.valueOf() + parseInt(currentWindow.window[0])));
            var endsAt   = new Date((this.dbAudio.measured_at.valueOf() + parseInt(currentWindow.window[1])));

            for (var tagName in currentWindow.classifications) {

              if (currentWindow.classifications.hasOwnProperty(tagName)) {

                if (tagName.toLowerCase() !== "ambient") {

                  preInsertGuardianAudioTags.push({
                    type: "classification",
                    value: tagName,
                    confidence: currentWindow.classifications[tagName],
                    begins_at: beginsAt,
                    ends_at: endsAt,
                    begins_at_offset: currentWindow.window[0],
                    ends_at_offset: currentWindow.window[1],
                    audio_id: this.dbAudio.id,
                    tagged_by_model: this.dbModel.id
                  });

                }

              }

            }

          }

        }

        return models.GuardianAudioTag.bulkCreate(preInsertGuardianAudioTags)
      })
      .then(function() {
        res.status(200).json([]);
      })
      .catch(function(err){
        console.log("failed to save tags | ", err);
        if (!!err) { res.status(404).json({ message: err.message || "Failed to save tags", error: { status: 500 } }); }
      });

  })
;

module.exports = router;



