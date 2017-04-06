var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

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
        var dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : "DESC";

        return models.GuardianAudio
          .findAll({ 
            where: dbQuery, 
            include: [ { all: true } ], 
            order: [ [dateClmn, dbQueryOrder] ],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function(dbAudio){

            if (dbAudio.length < 1) {
              httpError(res, 404, "database");
            } else {
              views.models.guardianAudioJson(req,res,dbAudio)
                .then(function(json){ res.status(200).json(json); });
            }

            return null;

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


router.route("/:guardian_id/audio")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian.findOne({ where: { guid: req.params.guardian_id }
    }).then(function(dbGuardian){
      console.info("Creating Audio for guardian : " + req.params.guardian_id);
      req.body.guardian_id = dbGuardian.id;
      req.body.site_id = dbGuardian.site_id;
      return views.models.transformCreateAudioRequestToModel(req.body);
    }).then(function(dbModel){
      console.info(dbModel);
      return models.GuardianAudio.create(dbModel);
    }).then(function(result){
      res.status(200).json(result);
    }).catch(function (err) {
      if(!err){
        console.info("Error was thrown without supplying an error message; please add a specific error message");
        err = "generic error.";
      }
      res.status(500).json({msg: "Failed to create audio: " + err});
    });
  });



module.exports = router;



