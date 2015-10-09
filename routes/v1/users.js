var models  = require("../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../utils/hash.js").hash;
var token = require("../../utils/auth-token.js").token;
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/login")
  .post(function(req,res) {

    var userInput = {
      email: (req.body.email != null) ? req.body.email.toLowerCase() : null,
      pswd: req.body.password
    };

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

          token.createUserToken({
            token_type: "login",
            created_by: req.rfcx.url_path,
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: 1440
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

        } else {
          res.status(401).json({ 
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

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var userInput = {
      type: ((req.body.type == null) ? "unspecified" : req.body.type.toLowerCase()),
      email: req.body.email.toLowerCase(),
      pswd: req.body.password
    };

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
            minutes_until_expiration: 1440
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
      .findOne({
        where: { guid: req.params.user_id }
      }).then(function(dbUser){

        res.status(200).json(views.models.users(req,res,dbUser));

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
        .findOne({
          where: { guid: req.params.user_id }
        }).then(function(dbUser){

          
          res.status(200).json(views.models.users(req,res,dbUser));


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
