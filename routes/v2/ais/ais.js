const express = require("express");
var router = express.Router();
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const ValidationError = require("../../../utils/converter/validation-error");
const EmptyResultError = require('../../../utils/converter/empty-result-error');
const hasRole = require('../../../middleware/authorization/authorization').hasRole;
const Converter = require("../../../utils/converter/converter");
const aiService = require('../../../services/ai/ai-service');

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    return aiService.getPublicAis()
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while getting public AIs."); console.log(e) });

  });

router.route("/create")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').toString();
    params.convert('aiCollectionGuid').toString();
    params.convert('aiGuid').toString();
    params.convert('lexicalEntryId').toString();
    params.convert('userGuid').toString();
    params.convert('stepSeconds').toNonNegativeInt().toFloat();
    params.convert('minWinwowsCount').toInt();
    params.convert('maxWindowsCount').toInt();
    params.convert('minConfidence').toFloat();
    params.convert('maxConfidence').toFloat();
    params.convert('minBoxPercent').toInt();
    params.convert('public').toBoolean();
    params.convert('guardiansWhitelist').toArray();

    params.validate()
      .then(() => {
        console.log('transformedParams---->>>>>>>', transformedParams);
        return aiService.createAi(transformedParams);
      })
      .then((data) => {
        console.log('data_________', data);
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message); console.log(e, 'AI_________400>>>>>>>>', ValidationError)})
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message); console.log('AI_________404>>>>>>>>', e, EmptyResultError)})
      .catch(e => { httpError(req, res, 500, e, "Error while creating the AI."); console.log('AI_________500>>>>>>>>', e) });

  });


router.route("/:guid")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    return aiService.getPublicAiByGuid(req.params.guid)
      .then((json) => {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => { httpError(req, res, 500, e, `Error while getting AI with guid "${req.params.guid}".`); console.log(e) });

  });

router.route("/:guid")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    return aiService.updateAiByGuid(req.params.guid, req.body)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while updating the AI."); console.log(e) });

  });

module.exports = router;
