var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1/models/_all.js").views;

router.route("/:guardian_id/audio/latest")
  .get(function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        models.GuardianAudio
          .findAll({ 
            where: { guardian_id: dbGuardian.id }, 
            include: [ { all: true } ], 
            order: [ ["measured_at", "DESC"] ],
            limit: req.rfcx.count
          }).then(function(dbAudio){

            res.status(200).json(views.guardianAudio(req,res,dbAudio));

        }).catch(function(err){
          console.log("failed to return audio | "+err);
          if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
        });

      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;



module.exports = router;



