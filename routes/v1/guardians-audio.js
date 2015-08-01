var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../misc/views.js").views;

router.route("/:guardian_id/audio/latest")
  .get(function(req,res) {

    models.Guardian
      .findOne({ 
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        models.GuardianAudio
          .findAll({ 
            where: { guardian_id: dbGuardian.id }, 
            include: [{ all: true }], 
            order: "measured_at DESC"
            // Had to add this and comment out below 
            // because there seems to be a bug in sequelize
            // the invokes the LIMIT prior to the ORDER
            // This should be fixed later
              +" LIMIT "+req.rfcx.count
        //    limit: req.rfcx.count
          }).then(function(dbAudio){

            res.status(200).json(views.guardianAudio(req,res,dbAudio));

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



