var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
var loggers = require('../../../utils/logger');
var Promise = require("bluebird");
var sequelize = require("sequelize");
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/:site_id/guardians")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), (req, res) => {

    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      })
      .bind({})
      .then((dbSite) => {
        if (!dbSite) {
          throw new sequelize.EmptyResultError(`No site "${req.params.site_id}" was found.`);
        }
        this.dbSite = dbSite;
        return models.Guardian.findAll({
          where: { site_id: dbSite.id },
          include: [ { all: true } ],
          order: [ ["last_check_in", "DESC"] ],
          limit: req.rfcx.limit,
          offset: req.rfcx.offset
        });
      })
      .then((dbGuardians) => {
        if (!dbGuardians.length) {
          throw new sequelize.EmptyResultError(`No guardians were found for site "${this.dbSite.guid}".`);
        }
        this.dbGuardians = dbGuardians;
        if (req.query.include_last_sync) {
          let proms = [];
          this.dbGuardians.forEach((dbGuardan) => {
            let prom = models.GuardianMetaBattery.findOne({
              where: { guardian_id: dbGuardan.id },
              order: [ ['measured_at', "DESC"] ],
            })
            .then((dbMetaBattery) => {
              if (dbMetaBattery) {
                dbGuardan.last_sync = dbMetaBattery.measured_at;
              }
              return true;
            });
            proms.push(prom);
          });
          return Promise.all(proms);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(() => {
        res.status(200).json(views.models.guardian(req, res, this.dbGuardians));
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch((err) => {
        logError('Failed to get guardians', { err });
        res.status(500).json({ msg: 'Failed to get guardians'});
      });

  })
;



module.exports = router;



