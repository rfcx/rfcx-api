var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var ApiConverter = require("../../../utils/api-converter");
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var passport = require("passport");
var sqlUtils = require("../../../utils/misc/sql");
var Promise = require("bluebird");
var urls = require('../../../utils/misc/urls');


function getModel(req) {
  if (req.query.model_guid) {
    return models.AudioAnalysisModel
      .findOne({
        where: {guid: req.query.model_guid}
      })
  }
  else {
    // empty promise to go through
    return new Promise(function(resolve){
      return resolve();
    });
  }
}

router.route("/methods")
  .get(function(req,res) {

    models.AudioAnalysisMethod
      .findAll({
        include: [{ all: true }]
      }).then(function(dbAnalysisMethods){

        if (dbAnalysisMethods.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.audioAnalysisMethods(req,res,dbAnalysisMethods));
        }
        
      }).catch(function(err){
        console.log("failed to return analysis methods | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return analysis methods"}); }
      });

  });

router.route('/models')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("audioAnalysisModel", req);

    models.AudioAnalysisModel
      .findAll({
        include: [{ all: true }]
      })
      .then(function(dbAnalysisModels){

        if (dbAnalysisModels.length < 1) {
          httpError(res, 404, "database");
        } else {
          var api = { type: 'audioAnalysisModels'};
          api.data = dbAnalysisModels.map(function (dbAnalysisModel) {
            return converter.mapSequelizeToApi(dbAnalysisModel.dataValues);
          });
          res.status(200).json(api);
        }

        return null;
      })
      .catch(function(err) {
        console.log("failed to return analysis models | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return analysis models"}); }
      })

  });

router.route('/models/unclassified_by_users')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("unclassified", req);

    var sql, opts = {
      tagValue: "chainsaw"
    };

    if (req.query.tagValue) {
      opts.tagValue = req.query.tagValue;
    }

    getModel(req)
      .then(function(model) {
        if (model) {
          opts.modelId = model.id;
        }

        sql = 'SELECT t.audio_id, a.guid, count(*) as count FROM GuardianAudioTags t LEFT JOIN GuardianAudioTags m ON m.audio_id=t.audio_id and m.begins_at_offset=t.begins_at_offset and m.type="label" and m.value=:tagValue LEFT JOIN GuardianAudio a ON a.id=t.audio_id where t.type="classification" and t.value=:tagValue and m.audio_id is NULL';

        sql = sqlUtils.condAdd(sql, opts.modelId, ' and t.tagged_by_model=:modelId');
        sql = sqlUtils.condAdd(sql, true, ' group by t.audio_id');

        return models.sequelize.query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
      })
      .then(function(data) {
        var api = converter.mapSequelizeToApi({
          events: data
        });

        res.status(200).json(api);

        return null;
      })
      .catch(function(err) {
        console.log("failed to return unclassified audio files | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return unclassified audio files"}); }
      });

  });

router.route('/models/precision')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("precision", req);

    var sql, opts = {
      tagValue: "chainsaw"
    };

    if (req.query.tagValue) {
      opts.tagValue = req.query.tagValue;
    }

    getModel(req)
      .then(function(model) {
        if (model) {
          opts.modelId = model.id;
        }

        sql = 'SELECT m.audio_id, SUM(CASE WHEN m.confidence=u.confidence and u.confidence=1 THEN 1 ELSE 0 END) as countConfirmed, SUM(CASE WHEN m.confidence=1 THEN 1 ELSE 0 END) as countAll, t.guid, t.measured_at as measuredAt, t.capture_sample_count, f.sample_rate FROM ' +
          '(SELECT audio_id, begins_at_offset, ROUND(AVG(confidence)) as confidence FROM GuardianAudioTags where type="label" and value=:tagValue group by audio_id, begins_at_offset) u ' +
          'LEFT JOIN (SELECT audio_id, begins_at_offset, type, value, tagged_by_model, ROUND(AVG(confidence)) as confidence FROM GuardianAudioTags where type="classification" and value=:tagValue group by audio_id, begins_at_offset) m ' +
          'ON u.audio_id=m.audio_id and u.begins_at_offset=m.begins_at_offset INNER JOIN GuardianAudio t ON t.id=m.audio_id INNER JOIN GuardianAudioFormats f ON f.id=t.format_id ';

        sql = sqlUtils.condAdd(sql, opts.modelId, ' and m.tagged_by_model=:modelId');
        sql = sqlUtils.condAdd(sql, true, ' group by m.audio_id');

        return models.sequelize.query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        ).then(function(data) {

            data.forEach(function(item) {
              if (item.capture_sample_count && item.sample_rate) {
                item.duration = Math.round(1000 * item.capture_sample_count / item.sample_rate);
                delete item.capture_sample_count;
                delete item.sample_rate;
              }
            });

            var api = converter.mapSequelizeToApi({
              events: data
            });

            res.status(200).json(api);

            return null;
          });
      })
      .catch(function(err) {
        console.log("failed to return models precision | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return models precision"}); }
      });

  });

router.route('/models/recall')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("recall", req);

    var sql, opts = {
      tagValue: "chainsaw"
    };

    if (req.query.tagValue) {
      opts.tagValue = req.query.tagValue;
    }

    getModel(req)
      .then(function(model) {
        if (model) {
          opts.modelId = model.id;
        }

        sql = 'SELECT m.audio_id, SUM(CASE WHEN m.confidence=u.confidence and u.confidence=1 THEN 1 ELSE 0 END) as countConfirmed, SUM(CASE WHEN u.confidence=1 THEN 1 ELSE 0 END) as countAll, t.guid, t.measured_at as measuredAt, t.capture_sample_count, f.sample_rate FROM ' +
          '(SELECT audio_id, begins_at_offset, ROUND(AVG(confidence)) as confidence FROM GuardianAudioTags where type="label" and value=:tagValue group by audio_id, begins_at_offset) u ' +
          'LEFT JOIN (SELECT audio_id, begins_at_offset, type, value, tagged_by_model, ROUND(AVG(confidence)) as confidence FROM GuardianAudioTags where type="classification" and value=:tagValue group by audio_id, begins_at_offset) m ' +
          'ON u.audio_id=m.audio_id and u.begins_at_offset=m.begins_at_offset INNER JOIN GuardianAudio t ON t.id=m.audio_id INNER JOIN GuardianAudioFormats f ON f.id=t.format_id ';

        sql = sqlUtils.condAdd(sql, opts.modelId, ' and m.tagged_by_model=:modelId ');
        sql = sqlUtils.condAdd(sql, true, ' group by m.audio_id ');

        return models.sequelize.query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        ).then(function(data) {

            data.forEach(function(item) {
              if (item.capture_sample_count && item.sample_rate) {
                item.duration = Math.round(1000 * item.capture_sample_count / item.sample_rate);
                delete item.capture_sample_count;
                delete item.sample_rate;
              }
            });

            var api = converter.mapSequelizeToApi({
              events: data
            });

            res.status(200).json(api);

            return null;
          });
      })
      .catch(function(err) {
        console.log("failed to return models precision | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return models precision"}); }
      });

  });

router.route('/models/:id')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("audioAnalysisModel", req);

    models.AudioAnalysisModel
      .findOne({
        where: {
          $or: {
            guid: req.params.id,
            shortname: req.params.id
          }
        },
        include: [{ all: true }]
      })
      .then(function(dbAnalysisModel){

        if (dbAnalysisModel.length < 1) {
          httpError(res, 404, "database");
        } else {

          // replace ids with `value`s from proper tables
          if (dbAnalysisModel.GuardianAudioEventType && dbAnalysisModel.GuardianAudioEventType.value) {
            dbAnalysisModel.event_type = dbAnalysisModel.GuardianAudioEventType.value;
          }
          if (dbAnalysisModel.GuardianAudioEventValue && dbAnalysisModel.GuardianAudioEventValue.value) {
            dbAnalysisModel.event_value = dbAnalysisModel.GuardianAudioEventValue.value;
          }

          var api = converter.mapSequelizeToApi(dbAnalysisModel.dataValues);
          // correct self link
          api.links.self = urls.getApiUrl(req) + '/analysis/models/' + req.params.id;
          res.status(200).json(api);
        }

        return null;
      })
      .catch(function(err) {
        console.log("failed to return analysis model | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return analysis model"}); }
      })

  });

module.exports = router;



