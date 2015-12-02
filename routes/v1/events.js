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
