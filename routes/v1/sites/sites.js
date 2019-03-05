var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require('sequelize');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
var Converter = require("../../../utils/converter/converter");
var ValidationError = require("../../../utils/converter/validation-error");
const userService = require('../../../services/users/users-service');
const sitesService = require('../../../services/sites/sites-service');

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req, res) {

    let where = {};
    if (req.query.include_inactive !== 'true') {
      where.is_active = true;
    }

    models.GuardianSite
      .findAll({
        where,
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
          res.status(200).json(views.models.guardianSites(req, res, dbSite, req.query.extended === 'true'));
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

    const sql = `SELECT s.guid as guid, s.name as name, s.created_at as created_at, SUM(a.capture_sample_count / f.sample_rate / 3600) as sum
                 FROM GuardianSites s
                 INNER JOIN GuardianAudio a ON a.site_id = s.id
                 INNER JOIN GuardianAudioFormats f ON a.format_id = f.id
                 GROUP BY s.id;`;

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
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req, res) {

    models.GuardianSite
      .findAll({
        where: { guid: req.params.site_id },
        limit: 1
      }).then(function(dbSite){

        if (dbSite.length < 1) {
          httpError(req, res, 404, "database");
        } else {
          res.status(200).json(views.models.guardianSites(req, res, dbSite, req.query.extended === 'true'));
        }

      }).catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;

router.route("/:guid")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['guardiansSitesAdmin']), function(req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('name').optional().toString();
    params.convert('description').optional().toString();
    params.convert('timezone').optional().toString();
    params.convert('bounds').optional().toArray();
    params.convert('map_image_url').optional().toString();
    params.convert('globe_icon_url').optional().toString();
    params.convert('classy_campaign_id').optional().toString();
    params.convert('protected_area').optional().toNonNegativeInt();
    params.convert('backstory').optional().toString();
    params.convert('is_active').optional().toBoolean();

    params.validate()
      .then(() => {
        return sitesService.getSiteByGuid(req.params.guid);
      })
      .then((site) => {
        return sitesService.updateSiteAttrs(site, transformedParams);
      })
      .then((site) => {
        return sitesService.formatSite(site, true);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || `Could not update the site.`));

  });

router.route("/:site_id/bounds")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['guardiansSitesAdmin']), function(req, res) {

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

  });



module.exports = router;



