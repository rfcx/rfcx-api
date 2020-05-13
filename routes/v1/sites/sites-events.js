var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:site_id/events")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      }).then(function(dbSite){

        var dbQuery = { site_id: dbSite.id };
        var dateClmn = "begins_at_analysis";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gt] = req.rfcx.starting_after; }
        if (req.query.reviewed != null) { dbQuery.reviewed_at = (req.query.reviewed === "true") ? { [models.Sequelize.Op.ne]: null } : null }

        models.GuardianEvent
          .findAll({
            where: dbQuery,
            include: [ { all: true } ],
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbEvents){

            if (dbEvents.length < 1) {
              httpError(req, res, 404, "database");
            } else {
              views.models.guardianEvents(req,res,dbEvents)
                .then(function(json){ res.status(200).json(json); });
            }

        }).catch(function(err){
          console.log("failed to return events | "+err);
          if (!!err) { res.status(500).json({msg:"failed to return events"}); }
        });

      }).catch(function(err){
        console.log("failed to find site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find site"}); }
      });

  })
;



module.exports = router;



