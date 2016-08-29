var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var ApiConverter = require("../../../utils/api-converter");

router.route("/")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var converter = new ApiConverter("event", req);

    var limit  = parseInt(req.query.limit) || 500,
        offset = parseInt(req.query.offset) || 0;

    // by default all clauses are empty. we will fill them if corresponding params are defined in url
    var whereClauses = {
      event: {},
      guardian: {},
      site: {},
      audio: {}
    };

    if (req.query.after_begins_at_analysis) {
      whereClauses.event.begins_at_analysis = {
        $gte: req.query.after_begins_at_analysis
      };
    }

    if (req.query.classification_analysis) {
      whereClauses.event.classification_analysis = req.query.classification_analysis;
    }

    if (req.query.guardian_guid) {
      whereClauses.guardian.guid = req.query.guardian_guid;
    }

    if (req.query.site_guid) {
      whereClauses.site.guid = req.query.site_guid;
    }

    if (req.query.after_measured_at) {
      whereClauses.audio.measured_at = {
        $gte: req.query.after_measured_at
      };
    }

    return models.GuardianEvent
      .findAndCountAll({
        where: whereClauses.event,
        include: [
          { model: models.GuardianAudio, as: 'Audio', where: whereClauses.audio },
          { model: models.Guardian, as: 'Guardian', where: whereClauses.guardian },
          { model: models.GuardianSite, as: 'Site', where: whereClauses.site },
          { model: models.GuardianCheckIn, as: 'CheckIn' }
        ],
        limit: limit,
        offset: offset
      }).then(function(dbEvents){
        var data = {
          limit: limit,
          offset: offset,
          number_of_results: dbEvents.count
        };
        if (dbEvents.rows.length) {
          return views.models.guardianEvents(req,res,dbEvents.rows)
            .then(function(json){
              data.result = json;
              var api = converter.cloneSequelizeToApi(data);
              res.status(200).json(api);
            });
        }
        else {
          data.result = [];
          var api = converter.cloneSequelizeToApi(data);
          return res.status(200).json(api);
        }
      })
      .catch(function (err) {
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
