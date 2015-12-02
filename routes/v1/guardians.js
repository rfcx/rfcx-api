var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var httpError = require("../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findAll({ 
//        where: { guardian_id: dbGuardian.id }, 
        include: [ { all: true } ], 
        order: [ ["last_check_in", "DESC"] ],
        limit: req.rfcx.limit,
        offset: req.rfcx.offset
      }).then(function(dbGuardian){
        
        if (dbGuardian.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.guardian(req,res,dbGuardian));
        }

      }).catch(function(err){
        console.log("failed to return guardians | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return guardians"}); }
      });
  
  })
;

router.route("/:guardian_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findAll({ 
        where: { guid: req.params.guardian_id },
        include: [ { all: true } ], 
        limit: 1
      }).then(function(dbGuardian){
        
        if (dbGuardian.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.guardian(req,res,dbGuardian));
        }

      }).catch(function(err){
        console.log("failed to return guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return guardian"}); }
      });

  })
;

module.exports = router;
