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
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");


router.route("/:guid/detections")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);
    params.convert('guardians').toArray();
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

module.exports = router;
