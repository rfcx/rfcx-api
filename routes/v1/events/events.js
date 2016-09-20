var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");

router.route("/event")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var contentType = req.rfcx.content_type;
    var isFile = false;
    if (req.url.indexOf('.json') !== -1 || req.url.indexOf('.csv') !== -1) {
      isFile = true;
    }

    var limit  = parseInt(req.query.limit) || 1000,
        offset = parseInt(req.query.offset) || 0;

    // by default all clauses are empty. we will fill them if corresponding params are defined in url
    var whereClauses = {
      event: {},
      site: {},
      audio: {}
    };

    if (req.query.updated_after) {
      whereClauses.event.updated_at = {
        $gt: req.query.updated_after
      };
    }

    if (req.query.updated_before) {
      whereClauses.event.updated_at = {
        $lt: req.query.updated_before
      };
    }

    if (req.query.created_after) {
      whereClauses.event.created_at = {
        $gt: req.query.created_after
      };
    }

    if (req.query.created_before) {
      whereClauses.event.created_at = {
        $lte: req.query.created_before
      };
    }

    if (req.query.starting_after) {
      whereClauses.audio.measured_at = {
        $gt: req.query.starting_after
      };
    }

    if (req.query.ending_before) {
      whereClauses.audio.measured_at = {
        $lte: req.query.ending_before
      };
    }

    if (req.query.minimum_confidence) {
      whereClauses.event.confidence = {
        $gte: req.query.minimum_confidence
      };
    }

    if (req.query.values) {
      whereClauses.event.value = {
        $in: req.query.values
      };
    }

    if (req.query.sites) {
      whereClauses.site.guid = {
        $in: req.query.sites
      };
    }

    if (req.query.types) {
      whereClauses.event.type = {
        $in: req.query.types
      };
    }

    return models.GuardianAudioEvent
      .findAndCountAll({
        where: whereClauses.event,
        limit: limit,
        offset: offset,
        include: [
          {
            model: models.GuardianAudio,
            as: 'Audio',
            where: whereClauses.audio,
            attributes: [
              'measured_at'
            ],
            include: [
              {
                model: models.GuardianSite,
                as: 'Site',
                where: whereClauses.site,
                attributes: [
                  'guid'
                ]
              },
              {
                model: models.Guardian,
                as: 'Guardian',
                attributes: [
                  'latitude',
                  'longitude'
                ]
              }
            ]
          },
          { model: models.GuardianAudioEventValue, as: 'Value' },
          { model: models.GuardianAudioEventType, as: 'Type' }
        ]
      })
      .then(function(dbEvents){
        console.log('dbEvents', dbEvents);
        if (contentType === 'json') {
          return views.models.guardianAudioEventsJson(req,res,dbEvents.rows)
            .then(function(json){
              res.status(200).json(json);
            });
        }
        else if (contentType === 'csv') {
          res.status(200).json({});
          //return views.models.guardianAudioEventsCSV(req,res,dbEvents.rows)
          //  .then(function(csv){
          //    data.result = csv;
          //    res.status(200).json(api);
          //  });
        }
      })
      .catch(function (err) {
        console.log('errrrr', arguments);
        res.status(500).json({msg: err});
      });

  });

router.route("/:event_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    return models.GuardianEvent
      .findAll({
        where: { guid: req.params.event_id },
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbEvent){

        if (dbEvent.length < 1) {
          httpError(res, 404, "database");
        } else {
          views.models.guardianEvents(req,res,dbEvent)
            .then(function(json){ res.status(200).json(json); });
        }

    }).catch(function(err){
      console.log(err);
      if (!!err) { httpError(res, 500, "database"); }
    });

  })
;

router.route("/:event_id/review")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianEvent
      .findAll({ 
        where: { guid: req.params.event_id }, 
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbEvent){

        if (dbEvent.length < 1) {
          httpError(res, 404, "database");
        } else {

          var reviewerInput = {
            classification: (req.body.classification != null) ? req.body.classification.toLowerCase() : null,
            begins_at: (req.body.begins_at != null) ? new Date(req.body.begins_at) : null,
            duration: (req.body.duration != null) ? parseInt(req.body.duration) : null,
            invalidated: (req.body.invalidated != null) ? req.body.invalidated : null
          };

          if (reviewerInput.classification != null) { dbEvent[0].classification_reviewer = reviewerInput.classification; }
          if (reviewerInput.begins_at != null) { dbEvent[0].begins_at_reviewer = reviewerInput.begins_at; }
          if (reviewerInput.duration != null) { dbEvent[0].duration_reviewer = reviewerInput.duration; }
          if (reviewerInput.invalidated != null) { if (reviewerInput.invalidated == "true") { dbEvent[0].invalidated_reviewer = true; } else if (reviewerInput.invalidated == "false") { dbEvent[0].invalidated_reviewer = false; } }


          dbEvent[0].reviewed_at = new Date();
          dbEvent[0].reviewer_id = req.rfcx.auth_token_info.owner_id;

          dbEvent[0].save();

          views.models.guardianEvents(req,res,dbEvent)
            .then(function(json){ res.status(200).json(json); });

        }

    }).catch(function(err){
      console.log(err);
      if (!!err) { httpError(res, 500, "database"); }
    });

  })
;

module.exports = router;
