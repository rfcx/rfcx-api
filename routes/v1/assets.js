var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");

router.route("/audio/:audio_id")
  .get(function(req,res) {

    models.GuardianAudio
      .findOne({ 
        where: { guid: req.params.audio_id }, 
        include: [{ all: true }]
      }).then(function(dbAudio){

        if (req.rfcx.content_type === "m4a") {
        
          views.models.guardianAudioFile(req,res,dbAudio);
          
        } else if (req.rfcx.content_type === "mp3") {
          views.models.TEMP_MP3_guardianAudioFile(req,res,dbAudio);
        } else if (req.rfcx.content_type === "opus") {
          views.models.TEMP_OGG_guardianAudioFile(req,res,dbAudio);
        } else if (req.rfcx.content_type === "wav") {
          views.models.TEMP_WAV_guardianAudioFile(req,res,dbAudio);

        } else if (req.rfcx.content_type === "png") {
          
          views.models.guardianSpectrogramFile(req,res,dbAudio);
        
        } else {
          
            views.models.guardianAudio(req,res,dbAudio)
              .then(function(audioJson){
                res.status(200).json(audioJson);
            });
        }
        
      }).catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  })
;



module.exports = router;



