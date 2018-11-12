var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var sequelize = require("sequelize");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const reportsService = require('../../../services/reports/reports-service');
const usersService = require('../../../services/users/users-service');
const guid = require('../../../utils/misc/guid');
const Converter = require("../../../utils/converter/converter");
const ValidationError = require("../../../utils/converter/validation-error");
const httpError = require("../../../utils/http-errors.js");

// create new report
router.route("/")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['appUser', 'rfcxUser']), function(req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('lat').toFloat();
    params.convert('long').toFloat();
    params.convert('reported_at').toString();
    params.convert('value').toString();
    params.convert('distance').optional().toNonNegativeInt();
    params.convert('age_estimate').toNonNegativeInt();

    params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .then((user) => {
        transformedParams.reporter = user.id;
        transformedParams.guid = guid.generate();
        return models.GuardianAudioEventValue.findOrCreate({
          where:    { value: transformedParams.value },
          defaults: { value: transformedParams.value }
        });
      })
      .then((dbGuardianAudioEventValue) => {
        transformedParams.value = dbGuardianAudioEventValue[0].id;
        if (req.files && req.files.audio) {
          return reportsService.uploadAudio(req.files.audio, transformedParams.guid, transformedParams.reported_at);
        }
        return null;
      })
      .then((filename) => {
        if (filename) {
          transformedParams.audio = `${process.env.ASSET_URLBASE}/report/audio/${filename}`;
        }
        return reportsService.createReport(transformedParams);
      })
      .then((dbReport) => {
        return reportsService.formatReport(dbReport);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || `Report couldn't be created.`));

  });

router.route("/:guid")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['appUser', 'rfcxUser']), function(req, res) {

    return reportsService.getReportByGuid(req.params.guid)
      .then((dbReport) => {
        return reportsService.formatReport(dbReport);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => {console.log('e', e); httpError(req, res, 500, e, e.message || `Could not find report.`)});

  });


module.exports = router;
