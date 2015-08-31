var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/audio")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        var dbQuery = { guardian_id: dbGuardian.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }

        models.GuardianAudio
          .findAll({ 
            where: dbQuery, 
            include: [ { all: true } ], 
            order: [ [dateClmn, "DESC"] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbAudio){

            views.models.guardianAudio(req,res,dbAudio)
              .then(function(audioJson){
                res.status(200).json(audioJson);
            });

            

        }).catch(function(err){
          console.log("failed to return audio | "+err);
          if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
        });

      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;



module.exports = router;



