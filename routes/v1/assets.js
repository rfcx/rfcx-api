var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

// router.route("/audio/:audio_id")
//   .get(passport.authenticate("token",{session:false}), function(req,res) {

//     models.GuardianAudio
//       .findOne({ 
//         where: { guid: req.params.audio_id }, 
//         include: [{ all: true }]
//       }).then(function(dbAudio){

//         if (req.rfcx.content_type === "m4a") {
//           views.models.guardianAudioFile(req,res,dbAudio);
//         } else if (req.rfcx.content_type === "png") {
//           views.models.guardianSpectrogramFile(req,res,dbAudio);
//         } else {
//             views.models.guardianAudio(req,res,dbAudio)
//               .then(function(audioJson){
//                 res.status(200).json(audioJson);
//             });
//         }
        
//       }).catch(function(err){
//         console.log("failed to return audio | "+err);
//         if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
//       });

//   })
// ;

router.route("/:shortlink_id")
  .get(function(req,res) {

    res.status(200).json({ shortlink: req.params.shortlink_id });

    // models.GuardianSite
    //   .findOne({ 
    //     where: { guid: req.params.site_id },
    //     include: [ { all: true } ]
    //   }).then(function(dbSite){
        
    //     res.status(200).json(views.models.guardianSites(req,res,dbSite));

    //   }).catch(function(err){
    //     console.log("failed to return site | "+err);
    //     if (!!err) { res.status(500).json({msg:"failed to return site"}); }
    //   });

  })
;

router.route("/")
  .get(function(req,res) {
    res.redirect(301, "https://api.rfcx.org/");
  })
;



module.exports = router;



