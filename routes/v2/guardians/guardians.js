var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var Promise = require("bluebird");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const guardiansService = require('../../../services/guardians/guardians-service');
var Converter = require("../../../utils/converter/converter");

router.route("/public")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('guids').toArray();

    return params.validate()
      .then(() => {
        let proms = [];
        let resObj = {}
        transformedParams.guids.forEach((guid) => {
          resObj[guid] = null; // null by default
          let prom = guardiansService.getGuardianByGuid(guid, true)
            .then((guardian) => {
              if (guardian) {
                resObj[guid] = guardiansService.formatGuardianPublic(guardian);
              }
              return guardian;
            });
          proms.push(prom);
        });
        return Promise.all(proms)
          .then(() => {
            return resObj;
          });
      })
      .then((data) => {
        res.status(200).send(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => { httpError(req, res, 500, e, `Error while getting guardians.`); console.log(e) });

  });

router.route("/:guid")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['guardianCreator']), function (req, res) {

    return guardiansService.getGuardianByGuid(req.params.guid)
      .then((guardian) => {
        return guardiansService.formatGuardian(guardian);
      })
      .then((json) => {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => { httpError(req, res, 500, e, `Error while getting guardian with guid "${req.params.guid}".`); console.log(e) });

  });

module.exports = router;
