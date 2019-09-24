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
const pathCompleteExtname = require('path-complete-extname');
const dirUtil = require('../../../utils/misc/dir');
const fileUtil = require('../../../utils/misc/file');
var path = require('path');

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin', 'systemUser']), function (req, res) {

    return aiService.getPublicAis()
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while getting public AIs."); console.log(e) });

  });

router.route("/collections")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    return aiService.getPublicCollections(req.query)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while getting public AICs.'); console.log(e) });

  });

router.route("/collections/:guid")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    return aiService.getPublicCollectionAndAisByGuid(req.params.guid)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, `Error while getting collection and ais by guid.`); console.log(e) });

  });

router.route("/create")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').optional().toString();
    params.convert('aiCollectionGuid').optional().toString();
    params.convert('aiGuid').toString();
    params.convert('labels').optional().toArray();
    // params.convert('lexicalEntryId').optional().toString();
    params.convert('stepSeconds').toNonNegativeInt().toFloat();
    params.convert('minWindowsCount').toInt();
    params.convert('maxWindowsCount').toInt();
    params.convert('minConfidence').toFloat();
    params.convert('maxConfidence').toFloat();
    params.convert('minBoxPercent').toInt();
    params.convert('public').toBoolean();
    params.convert('guardiansWhitelist').toArray();

    params.validate()
      .then(() => {
        return aiService.createAi(transformedParams);
      })
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message)})
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message)})
      .catch(e => { httpError(req, res, 500, e, "Error while creating the AI."); console.log(e)});

  });

router.route("/:guid/upload-file")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    let allowedExtensions = ['.tar.gz'];
    let file = req.files.file;
    if (!file) {
      return httpError(req, res, 400, null, 'No file provided.');
    }
    let extension = pathCompleteExtname(file.originalname);
    if (!allowedExtensions.includes(extension)) {
      return httpError(req, res, 400, null, `Wrong file type. Allowed types are: ${allowedExtensions.join(', ')}`);
    }

    let opts = {
      filePath: req.files.file.path,
      fileName: `${req.params.guid}${extension}`,
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

// AI model update

router.route("/:guid")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['aiAdmin']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('stepSeconds').toNonNegativeInt().toFloat();
    params.convert('minWindowsCount').toInt();
    params.convert('maxWindowsCount').toInt();
    params.convert('minConfidence').toFloat();
    params.convert('maxConfidence').toFloat();
    params.convert('minBoxPercent').toInt();
    params.convert('guardians').toArray();

    params.validate()
      .then(() => {
        return aiService.updateAiByGuid(req.params.guid, transformedParams)
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while updating the AI."); console.log(e) });

  });

router.route("/:guid/download")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let extension = `.tar.gz`;
    let fileName = `${req.params.guid}${extension}`;
    let aisPath = path.join(process.env.CACHE_DIRECTORY, 'ais');
    let opts = {
      filePath: aisPath,
      fileName: fileName,
      bucket: process.env.ASSET_BUCKET_AI,
    }
    return dirUtil.ensureDirExists(opts.filePath)
      .then(() => {
        return aiService.downloadAIFile(opts);
      })
      .then(() => {
        var sourceFilePath = `${opts.filePath}/${opts.fileName}`;
        return fileUtil.serveFile(res, sourceFilePath, opts.fileName, 'application/x-gzip, application/octet-stream', false);
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => {httpError(req, res, 500, e, "Error while downloading for model."); console.log(e) })
  });

module.exports = router;
