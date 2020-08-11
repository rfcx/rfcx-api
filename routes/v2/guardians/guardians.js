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
const usersService = require('../../../services/users/users-service');
const guardiansService = require('../../../services/guardians/guardians-service');
const sitesService = require('../../../services/sites/sites-service');
const streamsService = require('../../../services/streams/streams-service');
const streamsTimescaleService = require('../../../services/streams-timescale');
const usersTimescaleDBService = require('../../../services/users/users-service-timescaledb')
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

router.route("/register")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'guardianCreator']), async function(req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('guid').toString().toLowerCase();
    params.convert('shortname').optional().toString();
    params.convert('site').optional().toString();

    let token = hash.randomString(40);

    try {

      await params.validate();

      let guardianAttrs = { ...transformedParams, token };

      await usersTimescaleDBService.ensureUserSyncedFromToken(req)

      // Obtain creator info
      const dbUser = await usersService.getUserFromTokenInfo(req.rfcx.auth_token_info);
      if (dbUser) {
        guardianAttrs.creator_id = dbUser.id;
        guardianAttrs.is_private = true;
      }

      // Obtain site info
      if (transformedParams.site) {
        const dbSite = await sitesService.getSiteByGuid(transformedParams.site);
        if (dbSite) {
          guardianAttrs.site_id = dbSite.id;
        }
      }

      // Create guardian
      const dbGuardian = await guardiansService.createGuardian(guardianAttrs);
      // Create stream
      const dbStream = await streamsService.ensureStreamExistsForGuardian(dbGuardian);
      await streamsTimescaleService.ensureStreamExistsForGuardian(dbGuardian);

      res.status(200).json({
        name: dbGuardian.shortname,
        guid: dbGuardian.guid,
        stream: dbStream.guid,
        token: token,
        keystore_passphrase: process.env.GUARDIAN_KEYSTORE_PASSPHRASE,
      });
    }
    catch (e) {
      console.log('v2/guardians/register error', e);
      if (e instanceof sequelize.ValidationError) {
        let message = 'Validation error';
        try {
          message = e.errors && e.errors.length? e.errors.map((er) => er.message).join('; ') : e.message;
        } catch (err) { }
        httpError(req, res, 400, null, message);
      }
      else if (e instanceof sequelize.EmptyResultError) {
        httpError(req, res, 404, null, e.message);
      }
      else {
        res.status(500).json({ message: e.message, error: { status: 500 } });
      }
    }

  });

module.exports = router;
