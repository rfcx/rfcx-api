var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var PerceptionsAiService = require("../../../services/perceptions/perceptions-ai-service");
var ValidationError = require("../../../utils/converter/validation-error");
var ApiConverter = require("../../../utils/api-converter");
var urls = require("../../../utils/misc/urls");

router.route("/ai/models")
  .get(passport.authenticate("token",{session:false}), (req, res) => {

    var converter = new ApiConverter("models", req);

    return models.AudioAnalysisModel
      .findAll({
        include: [{ all: true }]
      })
      .then(function(data) {
        var outputData = data.map((model) => {
          return {
            guid: model.guid,
            shortname: model.shortname,
            is_active: model.is_active,
            experimental: model.experimental,
            event_type: model.GuardianAudioEventType? model.GuardianAudioEventType.value : null,
            event_value: model.GuardianAudioEventValue? model.GuardianAudioEventValue.value : null
          }
        })
        var api = converter.mapSequelizeToApi({
          models: data
        });
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/models';
        res.status(200).json(api);
      })
      .catch(function(err) {
        console.log("failed to return models | ", err);
        httpError(res, 500, err, 'failed to return models');
      });

  });

router.route("/ai/:guid")
  .post(passport.authenticate("token",{session:false}), (req, res) => {

    var params = {
      minimal_detected_windows: req.body.minimal_detected_windows,
      minimal_detection_confidence: req.body.minimal_detection_confidence,
      shortname: req.body.shortname,
      event_type: req.body.event_type,
      event_value: req.body.event_value,
      guid: req.params.guid,
      weights: req.files.weights.path,
      model: req.files.model.path,
      attributes: req.files.attributes.path
    };



    PerceptionsAiService.createAi(params)
      .then(created => res.status(200).json({
        shortname: params.shortname, guid: params.guid,
        minimal_detection_confidence: params.minimal_detection_confidence,
        minimal_detected_windows: params.minimal_detected_windows, created: created}))
      .catch(ValidationError, e => httpError(res, 400, null, e.message))
      // catch-all for any other that is not based on user input
      .catch(e => httpError(res, 500, e, `Perception Ai couldn't be created: ${e}`));

  });
module.exports = router;
