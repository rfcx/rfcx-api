var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:site_id/audio")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    return models.GuardianSite
      .findOne({ 
        where: { guid: req.params.site_id }
      }).then(function(dbSite){

        var dbQuery = { site_id: dbSite.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }

        return models.GuardianAudio
          .findAll({ 
            where: dbQuery,
            order: [ [dateClmn, "DESC"] ],
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
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;



module.exports = router;



