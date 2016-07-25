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

router.route('/models/precision')
  .get(passport.authenticate("token", {session: false}), requireUser, function(req, res) {

    var converter = new ApiConverter("precision", req);

    var opts = {
      tagValue: "chainsaw"
    };

    if (req.query.tagValue) {
      opts.tagValue = req.query.tagValue;
    }

    var sql = 'SELECT m.audio_id, count(*) FROM ' +
                '(SELECT audio_id, begins_at_offset, ROUND(AVG(confidence)) as confidence FROM GuardianAudioTags where type="label" and value=:tagValue group by audio_id, begins_at_offset) u ' +
                'INNER JOIN GuardianAudioTags m ON u.audio_id=m.audio_id and u.begins_at_offset=m.begins_at_offset and u.confidence=m.confidence where m.type="classification" and m.value=:tagValue ' +
                'group by m.audio_id;';

    models.sequelize.query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
      .then(function(data) {

        var api = converter.mapSequelizeToApi(data);

        res.status(200).json(api);

        return null;
      })
      .catch(function(err) {
        console.log("failed to return models precision | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return models precision"}); }
      });

  });

module.exports = router;



