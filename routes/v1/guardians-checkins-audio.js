var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require('../../models');
var express = require('express');
var router = express.Router();
var querystring = require('querystring');

router.route("/:guardian_id/checkins/:checkin_id/audio/:audio_id")
  .post(function(req, res) {

 //   var json = JSON.parse(querystring.parse("all="+req.body.json).all);

 //   if (verbose_logging) { console.log(json); }

      models.GuardianAudio
        .findOne( { where: { guid: req.params.audio_id } })
        .spread(function(dAudio){
          
          console.log("matched to audio: "+dAudio.guid);
          res.status(200).json({msg:"blah"});

        }).catch(function(err){
          console.log("failed to find audio reference | "+err);
          if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
        });

  })
;



module.exports = router;



