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

router.route("/register")
  .post(passport.authenticate(["token", 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser', 'guardianCreator']), function(req,res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('guid').toString().toLowerCase();
    params.convert('shortname').optional().toString();
    params.convert('platform').optional().toString();
    params.convert('site').optional().toString();

    params.validate()
      .then(() => {
        return models.Guardian
          .findOrCreate({
            where: {
              guid: transformedParams.guid,
              shortname: transformedParams.shortname? transformedParams.shortname : `RFCx Guardian (${transformedParams.guid.substr(0,6)})`
            }
          })
      })
      .spread((dbGuardian, created) => {

        let token = hash.randomString(40);
        var token_salt = hash.randomHash(320);
        dbGuardian.auth_token_salt = token_salt;
        dbGuardian.auth_token_hash = hash.hashedCredentials(token_salt, token);
        dbGuardian.auth_token_updated_at = new Date();
        dbGuardian.site_id = 1;

        return dbGuardian.save()
          .bind({})
          .then((dbGuardian) => {
            if (req.rfcx.auth_token_info && req.rfcx.auth_token_info.userType === 'auth0') {
              return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
                .then((user) => {
                  dbGuardian.creator = user.id;
                  dbGuardian.is_private = true;
                  return dbGuardian.save();
                });
            }
            else {
              return this.dbGuardian;
            };
          })
          .then((dbGuardian) => {
            let visibility = dbGuardian.is_private? 'private' : 'public';
            return models.StreamVisibility
              .findOrCreate({
                where:    { value: visibility },
                defaults: { value: visibility }
              })
              .spread((dbVisibility) => {
                let opts = {
                  guid: dbGuardian.guid,
                  name: dbGuardian.shortname,
                  site: dbGuardian.site_id,
                  created_by: dbGuardian.creator,
                  visibility: dbVisibility.id,
                }
                if (dbGuardian.creator) {
                  opts.created_by = dbGuardian.creator;
                }
                return models.Stream
                  .create(opts);
              });
          })
          .then(() => {
            res.status(200).json({
              name: dbGuardian.shortname,
              guid: dbGuardian.guid,
              token: token,
              keystore_passphrase: "tr33PROtect10n",
              stream: "stream_guid"
            });
          });
      })
      .catch(sequelize.ValidationError, e => {
        let message = 'Validation error';
        try {
          message = e.errors && e.errors.length? e.errors.map((er) => er.message).join('; ') : e.message;
        } catch (err) { }
        httpError(req, res, 400, null, message);
      })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(function(err) {
        console.log(err);
        res.status(500).json({ message: err.message, error: { status: 500 } });
      });

  });

module.exports = router;
