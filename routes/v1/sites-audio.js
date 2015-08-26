var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

router.route("/:site_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({ 
        where: { guid: req.params.site_id },
        include: [ { all: true } ], 
  //      order: [ ["measured_at", "DESC"] ],
        limit: req.rfcx.count
      }).then(function(dbSite){
        
        if (dbSite.Guardian == null) {
          res.status(500).json({msg:"no guardians attached to this site"});
        } else {

          var mostRecentGuardian = null, mostRecentCheckInTime = null;
          for (i in dbSite.Guardian) {
            if  (  (mostRecentCheckInTime == null)
                || (dbSite.Guardian[i].last_check_in.valueOf() mostRecentCheckInTime.valueOf())
                ) {
              mostRecentGuardian = dbSite.Guardian[i];
              mostRecentCheckInTime = dbSite.Guardian[i].last_check_in;
            }
          }


        
        }

        models.GuardianAudio
          .findAll({ 
            where: { guardian_id: dbGuardian.id }, 
            include: [ { all: true } ], 
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


        res.status(200).json(views.models.guardianSites(req,res,dbSite));

      }).catch(function(err){
        console.log("failed to return site | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return site"}); }
      });

  })
;



module.exports = router;



