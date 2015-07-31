var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../misc/views.js").views;

router.route("/:guardian_id/audio/latest")
  .get(function(req,res) {

    var count = (req.param("count") == null) ? 1 : parseInt(req.param("count"));

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        models.GuardianAudio
          .findAll({ 
            where: { guardian_id: dbGuardian.id }, 
            include: [{ all: true }], 
            order: "measured_at DESC", 
            limit: count
          }).then(function(dbAudio){
            
            var audioJson = [];
            for (i in dbAudio) {
              audioJson.push(views.guardianAudio(req,res,dbAudio[i]));
            }
            res.status(200).json(audioJson);

          }).catch(function(err){
            console.log("failed to find audio reference | "+err);
            if (!!err) { res.status(500).json({msg:"failed to find audio reference"}); }
          });

      }).catch(function(err){
        console.log("failed to find guardian reference | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian reference"}); }
      });

  })
;



module.exports = router;



