var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:site_id/events")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({ 
        where: { guid: req.params.site_id }
      }).then(function(dbSite){

        var dbQuery = { site_id: dbSite.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }

        models.GuardianEvent
          .findAll({ 
            where: dbQuery, 
            include: [ { all: true } ], 
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbEvents){

            views.models.guardianEvents(req,res,dbEvents)
              .then(function(eventJson){
                res.status(200).json(eventJson);
            });

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



