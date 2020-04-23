var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const streamsService = require('../../../services/streams/streams-service');
const streamsDetectionsService = require('../../../services/streams/streams-detections-service');
const aiService = require('../../../services/ai/ai-mysql-service');
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");


router.route("/:guid/detections")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);
    params.convert('guardians').toArray().nonEmptyArrayItem();
    params.convert('values').optional().toArray();
    params.convert('models').optional().toArray();

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        return streamsDetectionsService.getDetectionsByParams(transformedParams);
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for detections.'); console.log(e) });

  });

/**
 * Request payload example:
 * {
 *    "model": "cd9e47d0-ea47-ed6a-be06-3963ecea03bc",
 *    "detections": [
 *      {
 *          "starts": 1586764889000,
 *          "ends": 1586764890000,
 *          "confidence": 0.91231,
 *          "label": "americana"
 *      },
 *      {
 *          "starts": 1586764889000,
 *          "ends": 1586764890000,
 *          "confidence": 1,
 *          "label": "nasomaculatus"
 *      },
 *    ]
 * }
 */

router.route("/:guid/detections")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['systemUser']), function(req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('model').toString();
    params.convert('detections').toArray();

    let stream;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        stream = dbStream;
        // TODO: remove stub code from this function when MySQL AI part will be ready
        return aiService.getAiModelByGuid(transformedParams.model);
      })
      .then(() => {
        streamsDetectionsService.checkDetectionsValid(transformedParams.detections);
        return streamsDetectionsService.saveDetections(transformedParams.detections, stream, transformedParams.model);
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while creating annotations.'); console.log(e) });

  });

module.exports = router;
