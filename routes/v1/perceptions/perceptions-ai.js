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
var sequelize = require("sequelize");
var guidService = require('../../../utils/misc/guid.js');

/**
 * Takes guid and ai attributes and creates AI
 * @param {*} guid - ai guid to create
 * @param {*} req - request object
 * @param {*} res - response object
 */
function processAiCreation(guid, req, res) {

  var converter = new ApiConverter("ai", req);

  var params = {
    minimal_detected_windows: req.body.minimal_detected_windows,
    minimal_detection_confidence: req.body.minimal_detection_confidence,
    shortname: req.body.shortname,
    event_type: req.body.event_type,
    event_value: req.body.event_value,
    guid: guid,
    is_active: req.body.is_active,
    experimental: req.body.experimental,
    weights: req.files.weights.path,
    model: req.files.model.path,
    attributes: req.files.attributes.path
  };

  PerceptionsAiService.createAi(params)
    .then(ai => {
      var outputData = PerceptionsAiService.formatAi(ai);
      var api = converter.mapSequelizeToApi({
        ai: outputData
      });
      api.links.self = urls.getApiUrl(req) + '/perceptions/ai';
      res.status(200).json(api);
    })
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    // catch-all for any other that is not based on user input
    .catch(e => httpError(req, res, 500, e, `Perception Ai couldn't be created: ${e}`));
}

router.route("/ai")
  .get(passport.authenticate(['token', 'jwt'], { session:false }), (req, res) => {

    var converter = new ApiConverter("ai", req);

    return models.AudioAnalysisModel
      .findAll({
        include: [{ all: true }]
      })
      .then(function(data) {
        var outputData = data.map((ai) => {
          return PerceptionsAiService.formatAi(ai);
        })
        var api = converter.mapSequelizeToApi({
          ai: outputData
        });
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai';
        res.status(200).json(api);
      })
      .catch(function(err) {
        console.log("failed to return models | ", err);
        httpError(req, res, 500, err, 'failed to return models');
      });

  });

router.route("/ai/:id/precision/events")
  .get(passport.authenticate("token",{session:false}), (req, res) => {

    var converter = new ApiConverter("ai", req);

    PerceptionsAiService
      .findAi(req.params.id)
      .then(PerceptionsAiService.getEventsPrecisionForAI)
      .then((data) => {
        var api = converter.mapSequelizeToApi({
          data: data
        });
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id + '/precision/events';
        res.status(200).json(api);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => httpError(req, res, 500, e, `Perception Ai couldn't be found: ${e}`));

  });

router.route("/ai/:id")
  .get(passport.authenticate("token",{session:false}), (req, res) => {

    var converter = new ApiConverter("ai", req);

    PerceptionsAiService
      .findAi(req.params.id)
      .then(PerceptionsAiService.formatAi)
      .then((data) => {
        var api = converter.mapSequelizeToApi({
          ai: data
        });
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id;
        res.status(200).json(api);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => httpError(req, res, 500, e, `Perception Ai couldn't be found: ${e}`));

  });

router.route("/ai")
  .post(passport.authenticate("token",{session:false}), (req, res) => {

    processAiCreation(guidService.generate(), req, res);

  });

router.route("/ai/:guid")
  .post(passport.authenticate("token",{session:false}), (req, res) => {

    processAiCreation(req.params.guid, req, res);

  });

router.route("/ai/:id")
  .put(passport.authenticate("token",{session:false}), (req, res) => {

    var converter = new ApiConverter("ai", req);

    var params = {
      event_type: req.body.event_type,
      event_value: req.body.event_value,
      minimal_detection_confidence: req.body.minimal_detection_confidence,
      minimal_detected_windows: req.body.minimal_detected_windows,
      experimental: req.body.experimental,
      shortname: req.body.shortname,
      is_active: req.body.is_active
    };

    PerceptionsAiService
      .findAi(req.params.id)
      .then(function(ai) {
        return PerceptionsAiService.updateAi(ai, params);
      })
      .then(PerceptionsAiService.formatAi)
      .then((data) => {
        var api = converter.mapSequelizeToApi({
          ai: data
        });
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id;
        res.status(200).json(api);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, `Perception Ai couldn't be updated: ${e}`));

  });

module.exports = router;
