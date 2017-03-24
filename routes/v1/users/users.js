var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
const executeService = require('../../../services/execute-service');
const mailService = require('../../../services/mail/mail-service');

router.route("/login")
  .post(function(req,res) {
    var userInput = {
      email: (req.body.email != null) ? req.body.email.toLowerCase() : null,
      pswd: req.body.password
    };
    
    var loginExpirationInMinutes = 1440; // 1 day (24 hours)
    if ((req.body.extended_expiration != null) && (parseInt(req.body.extended_expiration) == 1)) {
      loginExpirationInMinutes = 5760; // 4 days
    }

    models.User 
      .findOne({
        where: { email: userInput.email }
      }).then(function(dbUser){

        if (dbUser == null) {
          res.status(401).json({ 
            message: "invalid email or password", error: { status: 401 }
          });
        } else if (dbUser.auth_password_hash == hash.hashedCredentials(dbUser.auth_password_salt,userInput.pswd)) {

          dbUser.last_login_at = new Date();
          dbUser.save();

          return token.createUserToken({
            token_type: "login",
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function(tokenInfo){

            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            };

            return res.status(200).json(views.models.users(req,res,dbUser));

          }).catch(function(err){
            console.log(err);
            res.status(500).json({
              message: err.message, error: { status: 500 }
            });
          });

        } else {
          return res.status(401).json({
            message: "invalid email or password", error: { status: 401 }
          });
        }

      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
      });
  
  });


router.route("/request-access/app")
  .post(function(req,res){
    const serviceRequest = {
      email_address: req.body.email_address,
      os: req.body.os
    };
    executeService(req, res, serviceRequest, mailService.registerToAppWaitingList, "Failed to subscribe");
  });

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var userInput = {
      type: ((req.body.type == null) ? "unspecified" : req.body.type.toLowerCase()),
      firstname: req.body.firstname || '',
      lastname: req.body.lastname || '',
      email: req.body.email.toLowerCase(),
      pswd: req.body.password
    };
    var loginExpirationInMinutes = 1440;

    models.User 
      .findOrCreate({
        where: { email: userInput.email }
      }).spread(function(dbUser, wasCreated){

        if (!wasCreated) {
          res.status(409).json({ 
            message: "A user with that username or email already exists", error: { status: 409 }
          });
        } else {

          dbUser.type = userInput.type;
          dbUser.firstname = userInput.firstname;
          dbUser.lastname = userInput.lastname;

          var password_salt = hash.randomHash(320);
          dbUser.auth_password_salt = password_salt;
          dbUser.auth_password_hash = hash.hashedCredentials(password_salt,userInput.pswd);
          dbUser.auth_password_updated_at = new Date();
          dbUser.save();

          token.createUserToken({
            token_type: "registration",
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: loginExpirationInMinutes
          }).then(function(tokenInfo){

            dbUser.VisibleToken = {
              token: tokenInfo.token,
              token_expires_at: tokenInfo.token_expires_at
            };

            res.status(200).json(views.models.users(req,res,dbUser));

          }).catch(function(err){
            console.log(err);
            res.status(500).json({
              message: err.message, error: { status: 500 }
            });
          });

        }
      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
      });
  
  });

// TO DO security measure to ensure that not any user can see any other user
router.route("/:user_id")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    models.User
      .findAll({
        where: { guid: req.params.user_id },
        limit: 1
      }).then(function(dbUser){

        if (dbUser.length < 1) {
          httpError(res, 404, "database");
        } else {
          res.status(200).json(views.models.users(req,res,dbUser));
        }

        return null;

      }).catch(function(err){
        console.log("failed to return user | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return user"}); }
      });

  })
;

// TO DO security measure to ensure that not any user can see any other user
router.route("/:user_id")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    if (req.rfcx.auth_token_info.guid === req.params.user_id) {
      models.User 
        .findAll({
          where: { guid: req.params.user_id },
          limit: 1
        }).then(function(dbUser){

          if (dbUser.length < 1) {
            httpError(res, 404, "database");
          } else {

            // now let's update the user info....

            res.status(200).json(views.models.users(req,res,dbUser));
          }

        }).catch(function(err){
          console.log("failed to update user | "+err);
          if (!!err) { res.status(500).json({msg:"failed to update user"}); }
        });
    } else {
      res.status(401).json({msg:"not allowed to edit another user's profile"});
    }
  })
;

module.exports = router;
