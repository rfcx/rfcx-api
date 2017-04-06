var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var sitesQuery = {};

    if (req.query.sites) {
      sitesQuery.guid = { $in: req.query.sites };
    }

    models.Guardian
      .findAll({
        include: [{
          model: models.GuardianSite,
          as: 'Site',
          where: sitesQuery,
          attributes: ['guid']
        }],
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

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var guardianInput = {
      guid: req.body.guid.toLowerCase(),
      token: req.body.token.toLowerCase()
    };

    models.Guardian 
      .findOrCreate({
        where: { guid: guardianInput.guid }
      }).spread(function(dbGuardian, wasCreated){

        if (!wasCreated) {
          res.status(200).json(
            views.models.guardian(req,res,dbGuardian)
            );
        } else {

          var token_salt = hash.randomHash(320);
          dbGuardian.auth_token_salt = token_salt;
          dbGuardian.auth_token_hash = hash.hashedCredentials(token_salt,guardianInput.token);
          dbGuardian.auth_token_updated_at = new Date();
          dbGuardian.save();

          res.status(200).json(
            views.models.guardian(req,res,dbGuardian)
            );

        }
      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
      });
  
  });

module.exports = router;
