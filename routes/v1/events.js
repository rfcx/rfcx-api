var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var httpError = require("../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:event_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianEvent
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

router.route("/:event_id")
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
            classification_reviewer: (req.body.classification_reviewer != null) ? req.body.classification_reviewer.toLowerCase() : null,
            begins_at_reviewer: (req.body.begins_at_reviewer != null) ? new Date(req.body.begins_at_reviewer) : null,
            duration_reviewer: (req.body.duration_reviewer != null) ? parseInt(req.body.duration_reviewer) : null
          };

          if (reviewerInput.classification_reviewer != null) { dbEvent[0].classification_reviewer = reviewerInput.classification_reviewer; }
          if (reviewerInput.begins_at_reviewer != null) { dbEvent[0].begins_at_reviewer = reviewerInput.begins_at_reviewer; }
          if (reviewerInput.duration_reviewer != null) { dbEvent[0].duration_reviewer = reviewerInput.duration_reviewer; }

          dbEvent[0].reviewed_at = new Date();
          
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

router.route("/:event_id")
  .delete(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianEvent
      .findAll({ 
        where: { guid: req.params.event_id }, 
        include: [ { all: true } ],
        limit: 1
      }).then(function(dbEvent){

        if (dbEvent.length < 1) {
          httpError(res, 404, "database");
        } else {

          dbEvent[0].invalidated_reviewer = true;
          dbEvent[0].reviewed_at = new Date();
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

router.route("/:event_id/fingerprint")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianEvent
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

module.exports = router;
