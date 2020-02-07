var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var loggers = require('../../../utils/logger');
var ValidationError = require("../../../utils/converter/validation-error");
var guardianGroupService = require('../../../services/guardians/guardian-group-service');
var auth0Service = require('../../../services/auth0/auth0-service');
var usersService = require('../../../services/users/users-service');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const sequelize = require("sequelize");
var Converter = require("../../../utils/converter/converter");
const Promise = require('bluebird');

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

// returns guardian groups bases on accessibleSites user attribute
router.route("/groups")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    let params = {
      extended: true,
    };
    if (req.rfcx.auth_token_info) {
      try {
        params.sites = req.rfcx.auth_token_info['https://rfcx.org/app_metadata'].accessibleSites || [];
      }
      catch(e) {
        params.sites = [];
      }
    }

    guardianGroupService
      .getGroups(params)
      .then((dbGroups) => {
        return guardianGroupService.formatGroups(dbGroups, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not get GuardianGroups."));

  });

router.route("/groups/admin")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardiansSitesAdmin']), function(req, res) {

    guardianGroupService
      .getAllGroups(true)
      .then((dbGroups) => {
        return guardianGroupService.formatGroups(dbGroups, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || "Could not get GuardianGroups."));

  });

router.route("/group/:shortname")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'guardiansSitesAdmin']), (req, res) => {

    guardianGroupService
      .getGroupByShortname(req.params.shortname)
      .then((dbGroup) => {
        return guardianGroupService.formatGroup(dbGroup, true);
      })
      .then((data) => { res.status(200).json(data); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => httpError(req, res, 500, e, e.message || "Could not get GuardianGroup with given shortname."));

  });

router.route("/groups/subscribe")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), (req, res) => {

    let user_id, email, guid;
    try {
      user_id = req.rfcx.auth_token_info.sub;
      email = req.rfcx.auth_token_info.email;
      guid = req.rfcx.auth_token_info.guid;
    }
    catch (e) {
      return httpError(req, res, 403, null, 'Unable to change subscription for user. Invalid authorization data.');
    }

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('groups').toArray();
    params.convert('subscription_email').optional().toString();

    params.validate()
      .then(() => {
        return usersService.getUserByGuidOrEmail(guid, email);
      })
      .then((dbUser) => {
        if (transformedParams.subscription_email) {
          return auth0Service.getToken()
            .then((token) => {
              return auth0Service.updateAuth0User(token, {
                user_id,
                subscription_email: transformedParams.subscription_email
              });
            })
            .then(() => {
              return usersService.updateUserAtts(dbUser, { subscription_email: transformedParams.subscription_email });
            })
            .then(() => {
              return Promise.resolve(dbUser);
            });
        }
        else {
          return Promise.resolve(dbUser);
        }
      })
      .then((dbUser) => {
        return usersService.subscribeUserToGroups(dbUser, transformedParams.groups);
      })
      .then(() => { res.status(200).json({ success: true }); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => httpError(req, res, 500, e, e.message || "Could not subscribe user to groups."));
  })

router.route("/groups/unsubscribe")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), (req, res) => {

    let email, guid;
    try {
      user_id = req.rfcx.auth_token_info.sub;
      email = req.rfcx.auth_token_info.email;
      guid = req.rfcx.auth_token_info.guid;
    }
    catch (e) {
      return httpError(req, res, 403, null, 'Unable to change subscription for user. Invalid authorization data.');
    }

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('groups').toArray();

    params.validate()
      .then(() => {
        return usersService.getUserByGuidOrEmail(guid, email);
      })
      .then((dbUser) => {
        return usersService.unsubscribeUserFromGroups(dbUser, transformedParams.groups);
      })
      .then(() => { res.status(200).json({ success: true }); })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => httpError(req, res, 500, e, e.message || "Could not unsubscribe user from groups."));

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



