var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../misc/views.js").views;

router.route("/:audio_id")
  .get(function(req,res) {
    var audio_id = req.params.audio_id,
        contentType = ((audio_id.lastIndexOf(".") >= 0) ? audio_id.substr(1+audio_id.lastIndexOf(".")) : "json"),
        guid = ((audio_id.lastIndexOf(".") >= 0) ? audio_id.substr(0,audio_id.lastIndexOf(".")) : audio_id);
    models.GuardianAudio
      .findOne({ 
        where: { guid: guid }, 
        include: [{ all: true }]
      }).then(function(dbAudio){

        if (contentType === "m4a") {
          views.guardianAudioFile(dbAudio,res);
        } else {
          res.status(200).json([views.guardianAudio(dbAudio)]);
        }
        
      }).catch(function(err){
        console.log("failed to find audio reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
      });

  })
;



module.exports = router;



