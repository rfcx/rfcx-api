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
