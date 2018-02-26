var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var querystring = require("querystring");
var fs = require("fs");
var passport = require("passport");
var httpError = require("../../../utils/http-errors.js");
var analysisUtils = require("../../../utils/rfcx-analysis/analysis-queue.js").analysisUtils;
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var loggers = require('../../../utils/logger');
var sequelize = require("sequelize");
var websocket = require('../../../utils/websocket');
const analysisService = require('../../../services/analysis/analysis-service');

var logDebug = loggers.debugLogger.log;

router.route("/:audio_id/tags")
  .post(passport.authenticate("token",{session:false}), function(req, res) {
    try {
      analysisResults = req.body.json;
      logDebug('Audio tags endpoint: extracted json', { req: req, json: analysisResults });
    }
    catch (e) {
      loggers.warnLogger.log('Audio tags endpoint: invalid json data', { req: req });
      return httpError(req, res, 400, null, 'Failed to parse json data');
    }

    if (!analysisResults.results || !analysisResults.results.length) {
      loggers.warnLogger.log('Audio tags endpoint: request payload doesn\'t contain tags', { req: req });
      return httpError(req, res, 400, null, 'Request payload doesn\'t contain tags');
    }

    return models.GuardianAudio
      .findOne( { where: { guid: req.params.audio_id }, include: [{ all: true }] })
      .bind({})
      .then(function(dbAudio) {
        if (!dbAudio) {
          loggers.errorLogger.log('Audio with given guid not found', { req: req });
          throw new sequelize.EmptyResultError('Audio with given guid not found');
        }
        logDebug('Audio tags endpoint: dbAudio founded', {
          req: req,
          audio: Object.assign({}, dbAudio.toJSON()),
        });
        this.dbAudio = dbAudio;
        return models.AudioAnalysisModel.findOne({where: {guid: analysisResults.model}});
      })
      .then(function(dbModel){
        if (!dbModel) {
          loggers.errorLogger.log('Model with given guid not found', { req: req });
          throw new sequelize.EmptyResultError('Model with given guid not found');
        }
        logDebug('Audio tags endpoint: dbModel founded', {
          req: req,
          model: Object.assign({}, dbModel.toJSON()),
        });
        this.dbModel = dbModel;

        var removePromises = [];
        let logTagNames = [];
        // if model has already classified this file, then remove all previous tags
        for (var wndwInd in analysisResults.results) {
          if (analysisResults.results.hasOwnProperty(wndwInd)) {
            var currentWindow = analysisResults.results[wndwInd];

            for (var tagName in currentWindow.classifications) {
              if (currentWindow.classifications.hasOwnProperty(tagName)) {
                if (tagName.toLowerCase() !== "ambient") {
                  logTagNames.push(tagName);
                  var promise = models.GuardianAudioTag
                    .destroy({
                      where: {
                        audio_id: this.dbAudio.id,
                        type: 'classification',
                        value: tagName,
                        tagged_by_model: dbModel.id
                      }
                    });
                  removePromises.push(promise);
                }
              }
            }
          }
        }
        logDebug('Audio tags endpoint: remove previous tags', {
          req: req,
          modelGuid: dbModel.guid,
          audioGuid: this.dbAudio.guid,
          values: logTagNames,
        });
        return Promise.all(removePromises);
      })
      .then(function() {
        logDebug('Audio tags endpoint: previous tags removed', { req: req });
        // contains all probabilities for the model
        this.probabilityVector = [];
        this.cognitionValue = "";
        var preInsertGuardianAudioTags = [];
        this.eventBeginsAt = this.dbAudio.measured_at;
        this.eventEndsAt = this.dbAudio.measured_at;

        for (wndwInd in analysisResults.results) {
          var currentWindow = analysisResults.results[wndwInd];

          var beginsAt = new Date((this.dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[0])));
          var endsAt = new Date((this.dbAudio.measured_at.valueOf()+parseInt(currentWindow.window[1])));
          if(endsAt > this.eventEndsAt){
            this.eventEndsAt = endsAt;
          }

          for (tagName in currentWindow.classifications) {

            // if (currentWindow.classifications[tagName] > 0.5) {
            if (tagName.toLowerCase() != "ambient") {
              var probability =  currentWindow.classifications[tagName];
              this.cognitionValue = tagName;

              preInsertGuardianAudioTags.push({
                type: "classification",
                value: tagName,
                confidence: probability,
                begins_at: beginsAt,
                ends_at: endsAt,
                begins_at_offset: currentWindow.window[0],
                ends_at_offset: currentWindow.window[1],
                audio_id: this.dbAudio.id,
                tagged_by_model: this.dbModel.id
              });
              this.probabilityVector.push( probability );

            }

          }

        }
        logDebug('Audio tags endpoint: creating new tags', {
          req: req,
          tagsData: preInsertGuardianAudioTags,
        });
        return models.GuardianAudioTag.bulkCreate(preInsertGuardianAudioTags)
      })
      .then(function (tags) {
        var tagsJson = tags.map(function(tag) {
          return tag.toJSON();
        })
        logDebug('Audio tags endpoint: created new tags', {
          req: req,
          tagsJson: tagsJson,
        });

        analysisService.findStateByName('perc_done')
          .then((state) => {
            analysisService.changeEntityState(this.dbAudio.id, this.dbModel.id, state.id);
          });

        let wsObj = analysisUtils.prepareWsObject(this.dbAudio, tagsJson, this.dbModel);
        websocket.send('createAudioPerception', wsObj);

        if(this.dbModel.generate_event==0){
          logDebug('Audio tags endpoint: model not generating events, finishing', { req: req });
          return tags;
        }
        // queue up cognition analysis
        // current we only support window-count analysis method
        // Todo: this code will be deleted and live in an own cognition layer application/env
        var cognitionParmas = {
          analysis_method: "window-count",
          params:  {
            min_max_windows: [
              // -1 = infinity
              [this.dbModel.minimal_detected_windows, -1]
            ],
            min_max_probability: [
              // 1.0 = max prob
              [this.dbModel.minimal_detection_confidence, 1.0]
            ]
          },
          data: [ this.probabilityVector ],
          cognition_type: "event",
          cognition_value: this.cognitionValue
        };


        var createdEvent = {
          type: this.dbModel.event_type,
          value: this.dbModel.event_value,
          begins_at: this.eventBeginsAt,
          ends_at: this.eventEndsAt,
          audio_id: req.params.audio_id,
          model:  this.dbModel.shortname
        };

        var options = {
          api_url_domain: req.rfcx.api_url_domain
        };

        logDebug('Audio tags endpoint: model is generating events', {
          req: req,
          createdEvent: createdEvent,
          cognitionParmas: cognitionParmas,
          options: options,
        });

        return analysisUtils.queueForCognitionAnalysis("rfcx-cognition", createdEvent, cognitionParmas, options);

      })
      .then(function() {
        logDebug('Audio tags endpoint: finishing', { req: req });
        res.status(200).json([]);
      })
      .catch(sequelize.EmptyResultError, function(err) {
        loggers.errorLogger.log('Failed to save tags', { req: req, err: err });
        httpError(req, res, 404, null, err.message);
      })
      .catch(function(err){
        loggers.errorLogger.log('Failed to save tags', { req: req, err: err });
        httpError(req, res, 500, err, 'Failed to save tags');
      });

  })
;

module.exports = router;



