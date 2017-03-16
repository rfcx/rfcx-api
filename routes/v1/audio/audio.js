var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var httpError = require("../../../utils/http-errors.js");
var Promise = require("bluebird");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");
var urls = require('../../../utils/misc/urls');
var sequelize = require("sequelize");
var sqlUtils = require("../../../utils/misc/sql");
var condAdd = sqlUtils.condAdd;
var SensationsService = require("../../../services/sensations/sensations-service");

router.route("/filter")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var converter = new ApiConverter("audio", req);

    var order = 'measured_at ASC';

    if (req.query.order && ['ASC', 'DESC', 'RAND'].indexOf(req.query.order.toUpperCase()) !== -1) {
      if (req.query.order === 'RAND') {
        order = [sequelize.fn('RAND', 'measured_at')];
      }
      else {
        order = 'measured_at ' + req.query.order.toUpperCase();
      }
    }

    var mainClasuse = {},
      siteClause = {},
      guardianClause = {};

    if (req.query.siteGuid) {
      siteClause.guid = req.query.siteGuid;
    }
    if (req.query.guardianGuid) {
      guardianClause.guid = req.query.guardianGuid;
    }
    if (req.query.start) {
      if (!mainClasuse.measured_at) {
        mainClasuse.measured_at = {};
      }
      mainClasuse.measured_at.$gte = req.query.start;
    }
    if (req.query.end) {
      if (!mainClasuse.measured_at) {
        mainClasuse.measured_at = {};
      }
      mainClasuse.measured_at.$lte = req.query.end;
    }

    models.GuardianAudio
      .findAll({
        where: mainClasuse,
        order: order,
        include: [
          {
            model: models.GuardianSite,
            as: 'Site',
            where: siteClause,
            attributes: ['guid', 'timezone', 'timezone_offset']
          },
          {
            model: models.Guardian,
            as: 'Guardian',
            where: guardianClause,
            attributes: ['guid']
          },
          {
            model: models.GuardianAudioFormat,
            as: 'Format',
            attributes: ['sample_rate']
          }
        ],
        limit: req.query.limit? parseInt(req.query.limit) : 100
      }).then(function(dbAudio){

        return views.models.guardianAudioJson(req,res,dbAudio)
          .then(function(audioJson){

            var api = converter.cloneSequelizeToApi({audios: audioJson});

            api.links.self = urls.getBaseUrl(req) + req.originalUrl;
            res.status(200).json(api);

          });

      }).catch(function(err){
        console.log("failed to return audios | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audios"}); }
      });

  });

router.route("/filter/by-tags")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var converter = new ApiConverter("audio", req);

    var filterOpts = {};

    if (req.query.limit) {
      filterOpts.limit = parseInt(req.query.limit);
    }

    if (req.query.tagType) {
      filterOpts.tagType = req.query.tagType;
    }

    if (req.query.tagValue) {
      filterOpts.tagValue = req.query.tagValue;
    }

    if (req.query.userGuid) {
      filterOpts.userGuid = req.query.userGuid;
    }

    if (req.query.modelGuid) {
      filterOpts.modelGuid = req.query.modelGuid;
    }

    if (req.query.minConfidence) {
      filterOpts.minConfidence = parseFloat(req.query.minConfidence);
    }

    if (req.query.maxConfidence) {
      filterOpts.maxConfidence = parseFloat(req.query.maxConfidence);
    }

    if (req.query.minCount) {
      filterOpts.minCount = parseInt(req.query.minCount);
    }

    var sql = 'SELECT DISTINCT a.id as audioId, a.guid, count(a.id) as count FROM GuardianAudio a ' +
                'LEFT JOIN GuardianAudioTags t on a.id=t.audio_id ';

    sql = condAdd(sql, filterOpts.userGuid, ' INNER JOIN Users u on u.id = t.tagged_by_user');
    sql = condAdd(sql, filterOpts.modelGuid, ' INNER JOIN AudioAnalysisModels m on m.id = t.tagged_by_model');

    sql = condAdd(sql, true, ' where 1=1');
    sql = condAdd(sql, filterOpts.userGuid, ' and u.guid = :userGuid');
    sql = condAdd(sql, filterOpts.modelGuid, ' and m.guid = :modelGuid');

    sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType');
    sql = condAdd(sql, filterOpts.tagValue, ' and t.value = :tagValue');
    sql = condAdd(sql, filterOpts.minConfidence, ' and t.confidence >= :minConfidence');
    sql = condAdd(sql, filterOpts.maxConfidence, ' and t.confidence <= :maxConfidence');
    sql = condAdd(sql, true, ' group by a.guid');
    sql = condAdd(sql, filterOpts.minCount, ' HAVING count(a.id) >= :minCount');
    sql = condAdd(sql, filterOpts.limit, ' LIMIT :limit');

    return models.sequelize.query(sql,
      { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
    )
      .then(function(dbAudio) {

        var guids = dbAudio.map(function(item) {
          return item.guid;
        });

        var api = converter.cloneSequelizeToApi({audios: guids});
        api.links.self = urls.getBaseUrl(req) + req.originalUrl;

        res.status(200).json(api);
      })
      .catch(function(err){
        console.log("failed to return audios | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audios"}); }
      });

  });

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


router.route("/:audio_id/createSensations")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    SensationsService.createSensationsFromGuardianAudio(req.params.audio_id)
      .then(sensations => res.status(200).json(sensations))
      .catch(err => {
        console.log("Failed to create sensations | " + err);
        if (!!err) {
          res.status(500).json({msg: "failed to create sensations"});
        }

      });
  });


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

router.route("/nextafter/:audio_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function(dbAudio){
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function(resolve){
            return resolve(null);
          });
        }
        else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  $gt: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{all: true}],
              limit: 1,
              order: [["measured_at", 'ASC']]
            });
        }

      })
      .then(function(dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpError(res, 404, "database");
        }
        return views.models.guardianAudioJson(req,res,dbAudio)
          .then(function(audioJson){
            res.status(200).json(audioJson);
          });

      })
      .catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  })
;

router.route("/prevbefore/:audio_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function(dbAudio){
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function(resolve){
            return resolve(null);
          });
        }
        else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  $lt: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{all: true}],
              limit: 1,
              order: [["measured_at", 'DESC']]
            });
        }

      })
      .then(function(dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpError(res, 404, "database");
        }
        return views.models.guardianAudioJson(req,res,dbAudio)
          .then(function(audioJson){
            res.status(200).json(audioJson);
          });

      })
      .catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  })
;

module.exports = router;



