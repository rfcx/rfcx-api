var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require("querystring");
var passport = require("passport");
var hash = require("../../../utils/misc/hash.js").hash;
var aws = require("../../../utils/external/aws.js").aws();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var loggers = require('../../../utils/logger');

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route("/:guardian_id/software/:software_role")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var softwareRole = req.params.software_role;
    var inquiringSoftwareRole = req.query.role;
    var inquiringSoftwareVersion = req.query.version;

    var inquiringGuardianBattery = parseInt(req.query.battery);
    var inquiringGuardianTimeStamp = new Date(parseInt(req.query.timestamp));

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      })
      .bind({})
      .then(function(dbGuardian) {
        this.dbGuardian = dbGuardian;
        return models.GuardianSoftware.findOne({
          where: { role: req.query.role }
        });
      })
      .then(function(dbSoftware) {
        this.dbSoftware = dbSoftware;
        return models.GuardianSoftwareVersion.findOne({
          where: {
            software_role_id: dbSoftware.id,
            version: req.query.version
          }
        });
      })
      .then(function(dbSoftwareVersion) {
        return models.GuardianMetaUpdateCheckIn.create({
          guardian_id: this.dbGuardian.id,
          version_id: dbSoftwareVersion.id,
          role_id: this.dbSoftware.id
        });
      })
      .then(function(){
        return models.GuardianMetaBattery.create({
          guardian_id: this.dbGuardian.id,
          check_in_id: null,
          measured_at: inquiringGuardianTimeStamp,
          battery_percent: inquiringGuardianBattery,
          battery_temperature: null
        });
      })
      .then(function() {
        var dbQuery = {
          is_available: true
        };
        if (softwareRole === 'all') {
          dbQuery.is_updatable = true;
        }
        else if (softwareRole === 'extra') {
          dbQuery.is_extra = true;
        }
        else {
          dbQuery.role = softwareRole;
        }
        return models.GuardianSoftware.findAll({
          where: dbQuery,
          include: [ { all: true } ],
          order: [ ['current_version_id', 'ASC'] ]
        });
      })
      .then(function(dSoftware) {
        res.status(200).json(
          (this.dbGuardian.is_updatable) ? views.models.guardianSoftware(req,res,dSoftware) : []
        );
      })
      .catch(function(err) {
        loggers.errorLogger.log('Failed to get latest software versions', { req: req, err: err });
        httpError(res, 500, err, 'Failed to get latest software versions');
      });
  })
;

// router.route("/software/:software_role")
//   .post(passport.authenticate("token",{session:false}), function(req,res) {

//   })
// ;

module.exports = router;
