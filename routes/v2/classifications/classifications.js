var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const classificationService = require('../../../services/classification/classification-service');
const Promise = require("bluebird");
const Converter = require("../../../utils/converter/converter");

router.route("/search")
  .get(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('q').toString();
    params.convert('levels').optional().toArray();

    params.validate()
      .then(() => {
        return classificationService.search({
          q: transformedParams.q,
          levels: transformedParams.levels,
        });
      })
      .then((dbClassifications) => {
        return classificationService.formatClassifications(dbClassifications);
      })
      .then((data) => {
        return res.status(200).json(data);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, "Error while searching for Classification."); console.log(e) });

  });

router.route("/:value/characteristics")
  .get(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    return classificationService.getCharacteristicsForClassification(req.params.value)
    .then((dbClassifications) => {
      return classificationService.formatClassifications(dbClassifications);
    })
    .then((data) => {
      return res.status(200).json(data);
    })
    .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
    .catch(e => { httpError(req, res, 500, e, "Error while searching for Characteristics."); console.log(e) });

  });

module.exports = router;
