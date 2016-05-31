var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:audio_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianAudio
      .findOne({ 
        where: { guid: req.params.audio_id }, 
        include: [{ all: true }]
      }).then(function(dbAudio){

          views.models.guardianAudioJson(req,res,dbAudio)
            .then(function(audioJson){
              res.status(200).json(audioJson);
          });
        
      }).catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  })
;



module.exports = router;



