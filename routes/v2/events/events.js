const express = require("express");
var router = express.Router();
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const eventsServiceNeo4j = require('../../../services/events/events-service-neo4j');
const ValidationError = require("../../../utils/converter/validation-error");
const hasRole = require('../../../middleware/authorization/authorization').hasRole;
const Converter = require("../../../utils/converter/converter");

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    return eventsServiceNeo4j.queryData(req)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching events."); console.log(e) });

  });

router.route("/:guid/windows")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    return eventsServiceNeo4j.queryWindowsForEvent(req.params.guid)
      .then(function(json) {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching for event tags."); console.log(e) });

  });

module.exports = router;
