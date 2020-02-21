var express = require("express");
var router = express.Router();
var models  = require("../../../models");
var guid = require('../../../utils/misc/guid');
var hash = require("../../../utils/misc/hash.js").hash;
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const streamsService = require('../../../services/streams/streams-service');
const streamsAnnotationsService = require('../../../services/streams/streams-annotations-service');
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");

const allowedVisibilities = ['private', 'public', 'site'];

router.route("/:guid/annotations")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').toInt().minimum(0).maximum(32503669200000);
    params.convert('value').optional().toString();

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        transformedParams.streamGuid = dbStream.guid;
        return streamsAnnotationsService.getAnnotationsByParams(transformedParams);
      })
      .then(function(dbAnnotations) {
        return streamsAnnotationsService.formatAnnotations(dbAnnotations);
      })
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for annotations.'); console.log(e) });

  });

router.route("/:guid/labels")
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('starts').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').optional().toInt().minimum(0).maximum(32503669200000);

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        transformedParams.streamGuid = dbStream.guid;
        return streamsAnnotationsService.getLabelsByParams(transformedParams);
      })
      .then(streamsAnnotationsService.formatDbLabels)
      .then((json) => {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for stream labels.'); console.log(e) });

  });

router.route("/:guid/annotations")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('annotations').toArray();

    let stream;

    params.validate()
      .then(() => {
        return streamsService.getStreamByGuid(req.params.guid)
      })
      .then((dbStream) => {
        stream = dbStream;
        streamsService.checkUserAccessToStream(req, dbStream);
        streamsAnnotationsService.checkAnnotationsValid(transformedParams.annotations);
        return streamsAnnotationsService.saveAnnotations(transformedParams.annotations, stream, req.rfcx.auth_token_info.owner_id);
      })
      .then(function(dbAnnotations) {
        return streamsAnnotationsService.formatAnnotations(dbAnnotations);
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

router.route("/annotations/:guid")
  .delete(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req,res) {

    return streamsAnnotationsService.getAnnotationByGuid(req.params.guid)
      .then((dbAnnotation) => {
        return streamsService.getStreamByGuid(dbAnnotation.Stream.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        return streamsAnnotationsService.getAnnotationByGuid(req.params.guid);
      })
      .then((dbAnnotation) => {
        streamsAnnotationsService.checkAnnotationBelongsToUser(dbAnnotation, req.rfcx.auth_token_info.owner_id);
        return streamsAnnotationsService.deleteAnnotationByGuid(req.params.guid);
      })
      .then(function(json) {
        res.status(200).send({ success: true });
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while deleting the annotation.'); console.log(e) });

  });

router.route("/annotations/:guid")
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), (req, res) => {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('starts').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('ends').optional().toInt().minimum(0).maximum(32503669200000);
    params.convert('freq_min').optional().toInt().minimum(0);
    params.convert('freq_max').optional().toInt().minimum(0);
    params.convert('confidence').optional().toFloat().default(1);
    params.convert('value').optional().toString();

    return params.validate()
      .then(() => {
        return streamsAnnotationsService.getAnnotationByGuid(req.params.guid)
      })
      .then((dbAnnotation) => {
        return streamsService.getStreamByGuid(dbAnnotation.Stream.guid)
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        return streamsAnnotationsService.getAnnotationByGuid(req.params.guid);
      })
      .then((dbAnnotation) => {
        streamsAnnotationsService.checkAnnotationBelongsToUser(dbAnnotation, req.rfcx.auth_token_info.owner_id);
        return streamsAnnotationsService.updateAnnotation(dbAnnotation, transformedParams);
      })
      .then(streamsAnnotationsService.formatAnnotation)
      .then((json) => {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while updating the annotation.'); console.log(e) });

  });

module.exports = router;
