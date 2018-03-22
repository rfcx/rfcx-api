var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require('sequelize');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const userService = require('../../../services/users/users-service');

router.route("/")
  .get(passport.authenticate('token', { session:false }), function(req, res) {
    models.GuardianSite
      .findAll({
        where: { is_active: true },
        limit: req.rfcx.limit,
        offset: req.rfcx.offset
      })
      .then((dbSite) => {
        if (req.query.filter_by_user !== undefined && req.query.filter_by_user.toString() !== 'false') {
          return userService.getUserByGuid(req.rfcx.auth_token_info.guid)
            .then((user) => {
              return userService.formatUser(user);
            })
            .then((user) => {
              return dbSite.filter((site) => {
                return user.accessibleSites.includes(site.guid);
              });
            });
        }
        else {
          return dbSite;
        }
      }).then((dbSite) => {

        if (dbSite.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.guardianSites(req,res,dbSite));
        }

      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;

router.route("/statistics/audio")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    const sql = 'SELECT s.guid as guid, s.name as name, s.created_at as created_at, ' +
                  'SUM(a.capture_sample_count / f.sample_rate / 60 /60) as sum FROM GuardianAudio a ' +
                  'INNER JOIN GuardianAudioFormats f ON a.format_id = f.id INNER JOIN GuardianSites s ON ' +
                  'a.site_id = s.id group by s.guid;';

    models.sequelize
      .query(sql, {
        type: models.sequelize.QueryTypes.Insert
      })
      .spread((data) => {
        res.status(200).json(data);
      })
      .catch(e => httpError(req, res, 500, e, "Couldn't get sites statistics."));

  });

router.route("/:site_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findAll({
        where: { guid: req.params.site_id },
        limit: 1
      }).then(function(dbSite){

        if (dbSite.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.guardianSites(req,res,dbSite));
        }

      }).catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;

router.route("/:site_id/bounds")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      })
      .then(function(dbSite){
        if (!dbSite) {
          httpError(req, res, 404, "database");
        } else {
          dbSite.bounds = {
            type: req.body.type,
            coordinates: req.body.coordinates
          };
          return dbSite.save();
        }
      })
      .then(function(dbSite) {
        res.status(200).json(views.models.guardianSites(req,res,dbSite));
      })
      .catch(function(err){
        console.log("Error updating site bounds. Check params please | "+err);
        if (!!err) { res.status(500).json({msg:"Error updating site bounds. Check params please."}); }
      });

  })
;



module.exports = router;



