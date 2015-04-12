var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");

router.route("/:guardian_id/checkins/:checkin_id/audio/:audio_id")
  .post(function(req, res) {

    models.Guardian
      .findOne( { where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian){

        models.GuardianCheckIn
          .findOne( { where: { guid: req.params.checkin_id } })
          .spread(function(dbCheckIn){

            models.GuardianAudio
              .findOne( { where: { guid: req.params.audio_id } })
              .spread(function(dbAudio){
                
                dbAudio.analyzed_at = new Date();
                dbAudio.analysis_sqs_msg_id = null; // need to add real sqs id once it gets added/sent to/from the analysis script request logic
                dbAudio.save();

                fs.readFile(req.files.json.path, 'utf8', function(err, data) {
                  if (err) throw err;
                  var audioEvents = JSON.parse(data);
                  for (eventInd in audioEvents) {
                    var audioEvent = audioEvents[eventInd];

                  }
                });

              }).catch(function(err){
                console.log("failed to find audio reference | "+err);
                if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
              });

          }).catch(function(err){
            console.log("failed to find checkIn reference | "+err);
            if (!!err) { res.status(500).json({msg:"failed to find checkIn reference"}); }
          });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian reference"}); }
      });

  })
;



module.exports = router;



