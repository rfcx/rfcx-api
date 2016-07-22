var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/events")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        var dbQuery = { guardian_id: dbGuardian.id };
        var dateClmn = "begins_at_analysis";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }
        if (req.query.reviewed != null) {
          if (req.query.reviewed === "true") {
            dbQuery.reviewed_at = { $ne: null };
            dateClmn = "reviewed_at";
          }
        }

        return models.GuardianEvent
          .findAll({ 
            where: dbQuery, 
            include: [ { all: true } ], 
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbEvents){

            views.models.guardianEvents(req,res,dbEvents)
              .then(function(json){ res.status(200).json(json); });

            return null;

        }).catch(function(err){
          console.log("failed to return events | "+err);
          if (!!err) { res.status(500).json({msg:"failed to return events"}); }
        });

      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;

router.route("/:guardian_id/events/lite")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        var dbQuery = { guardian_id: dbGuardian.id };
        var dateClmn = "begins_at_analysis";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }
        if (req.query.reviewed != null) {
          if (req.query.reviewed === "true") {
            dbQuery.reviewed_at = { $ne: null };
            dateClmn = "reviewed_at";
          }
        }

        req.rfcx.limit = (req.query.limit == null) ? 1 : parseInt(req.query.limit);
        if (req.rfcx.limit > 5000) { req.rfcx.limit = 5000; } else if (req.rfcx.limit < 1) { req.rfcx.limit = 1; }

        return models.GuardianEvent
          .findAll({ 
            where: dbQuery, 
            include: [ { all: true } ], 
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbEvents){

            views.models.guardianEventsLite(req,res,dbEvents)
              .then(function(json){ res.status(200).json(json); });

            return null;

        }).catch(function(err){
          console.log("failed to return events | "+err);
          if (!!err) { res.status(500).json({msg:"failed to return events"}); }
        });

      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;



module.exports = router;



