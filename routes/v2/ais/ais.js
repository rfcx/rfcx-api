const express = require("express");
var router = express.Router();
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const ValidationError = require("../../../utils/converter/validation-error");
const EmptyResultError = require('../../../utils/converter/empty-result-error');
const hasRole = require('../../../middleware/authorization/authorization').hasRole;
const Converter = require("../../../utils/converter/converter");
const aiService = require('../../../services/ai/ai-service');
var sequelize = require("sequelize");

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
    params.convert('stepSeconds').toNonNegativeInt().toFloat();
    params.convert('minWindowsCount').toInt();
    params.convert('maxWindowsCount').toInt();
    params.convert('minConfidence').toFloat();
    params.convert('maxConfidence').toFloat();
    params.convert('minBoxPercent').toInt();
    params.convert('public').toBoolean();
    params.convert('guardiansWhitelist').toArray();
    params.convert('version').toInt().minimum(1);

    params.validate()
      .then(() => {
        return aiService.createAi(transformedParams);
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message)})
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message)})
      .catch(e => { httpError(req, res, 500, e, "Error while creating the AI.")});

  });

router.route("/upload-file")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    let opts = {
      filePath: req.files.file.path,
      fileName: req.files.file.originalname,
      bucket: process.env.ASSET_BUCKET_AI,
    }
    return aiService.uploadAIFile(opts)
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || `File couldn't be uploaded.`));

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
