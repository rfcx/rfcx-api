var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:site_id/audio/latest")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({ 
        where: { guid: req.params.site_id }
      }).then(function(dbSite){

        models.GuardianAudio
          .findAll({ 
            where: { site_id: dbSite.id }, 
       //     include: [ { all: true } ], 
            order: [ ["measured_at", "DESC"] ],
            limit: req.rfcx.count
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
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;



module.exports = router;



