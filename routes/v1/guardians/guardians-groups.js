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

router.route("/groups")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    guardianGroupService
      .getAllGroups(true)
      .then((dbGroups) => {
        return guardianGroupService.formatGroups(dbGroups, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not get GuardianGroup with given shortname."));

  });

router.route("/group/:shortname")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .getGroupByShortname(req.params.shortname)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not get GuardianGroup with given shortname."));

  });

router.route("/group")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .createGroup(req.body)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not create GuardianGroup with given params."));

  });

router.route("/group/:shortname")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .updateGroup(req.params.shortname, req.body)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not update GuardianGroup with given params."));

  });

router.route("/group/:shortname")
  .delete(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .deleteGroupByShortname(req.params.shortname)
      .then(() => { res.status(200).json({ success: true }); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not update GuardianGroup with given params."));

  });

module.exports = router;



