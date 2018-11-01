var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var loggers = require('../../../utils/logger');
var ValidationError = require("../../../utils/converter/validation-error");
var guardianGroupService = require('../../../services/guardians/guardian-group.service');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/group")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .createGroup(req.body)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not create GuardianGroup with provided params."));

  });

module.exports = router;



