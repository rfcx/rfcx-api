var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:audio_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianAudio
      .findOne({ 
        where: { guid: req.params.audio_id }, 
        include: [{ all: true }]
      }).then(function(dbAudio){

          return views.models.guardianAudioJson(req,res,dbAudio)
            .then(function(audioJson){
              res.status(200).json(audioJson);
          });
        
      }).catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  })
;

// implements a majority vote for each sample in the audio file
router.route("/:audio_id/labels")
    .get(passport.authenticate("token",{session:false}), requireUser, function(req,res) {

        // this is a greatest n per group for the greatest count of labels applied to each window
        // it uses the id of the tag as a tiebreaker in case that equally many votes are cast
        // for two or more labels
        var sql = "SELECT c1.begins_at, c1.label, c1.votes FROM \
        (SELECT t.begins_at, t.value as label, count(t.value) as votes, min(t.id) as tagId from GuardianAudioTags t \
        INNER JOIN GuardianAudio a ON t.audio_id=a.id \
        where t.type='label' \
        and a.guid=:audi_id \
        group by t.audio_id, t.begins_at, t.value) c1 \
        LEFT OUTER JOIN \
        (SELECT t.begins_at, t.value as label, count(t.value) as votes, min(t.id) as tagId from GuardianAudioTags t \
        INNER JOIN GuardianAudio a ON t.audio_id=a.id \
        where t.type='label' \
        and a.guid=:audio_id \
        group by t.audio_id, t.begins_at, t.value) c2 \
        ON c1.begins_at=c2.begins_at and ( c1.votes < c2.votes or (c1.votes = c2.votes and c1.tagId < c2.tagId)) \
        WHERE c2.begins_at IS NULL \
        ORDER BY c1.begins_at ASC";

        var filter = {
            audio_id: req.params.audio_id
        };

        models.sequelize.query(sql,
            { replacements: filter, type: models.sequelize.QueryTypes.SELECT }
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



