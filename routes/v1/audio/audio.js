var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var sequelize = require('../../../models/index');
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

router.route("/:audio_id/labels")
    .get(passport.authenticate("token",{session:false}), requireUser, function(req,res) {

        var sql = "SELECT t.begins_at, t.value as label from GuardianAudioTags t " +
                "INNER JOIN GuardianAudio a ON t.audio_id=a.id " +
                "where t.type='label' " +
                "and a.guid=:audio_id  " +
                "group by t.audio_id, t.begins_at, t.value " +
                "having count(t.value) >= 2 ORDER BY t.begins_at ASC";

        var filter = {
            audio_id: req.params.audio_id
        };

        sequelize.sequelize.query(sql,
            { replacements: filter, type: sequelize.sequelize.QueryTypes.SELECT }
        ).then(function(labels){

            return views.models.guardianAudioLabels(req,res,labels)
                .then(function(labelsJson){
                    res.status(200).json(labelsJson);
                });

        }).catch(function(err){
            console.log("failed to return labels | "+err);
            if (!!err) { res.status(500).json({msg:"failed to return the right labels."}); }
        });

    })
;




module.exports = router;



