var models  = require("../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../misc/hash.js").hash;
var views = require("../../views/v1/models/_all.js").views;
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var user_username = req.body.username,
        user_password = req.body.password,
        user_email = req.body.email,
        user_type = req.body.type
        ;

    models.User 
      .findOrCreate({
        where: { email: user_email, username: user_username }
      }).spread(function(dbUser, wasCreated){

        if (!wasCreated) {
          res.status(500).json({msg:"user already exists"});
        } else {

          dbUser.type = user_type;

          var password_salt = hash.randomHash(320);
          dbUser.auth_password_salt = password_salt;
          dbUser.auth_password_hash = hash.hashedCredentials(password_salt,user_password);
          dbUser.auth_password_updated_at = new Date();
          dbUser.save();

          var token = hash.randomToken(40);
          var token_salt = hash.randomHash(320);
          dbUser.auth_token_salt = token_salt;
          dbUser.auth_token_hash = hash.hashedCredentials(token_salt,token);
          dbUser.auth_token_updated_at = new Date();
          dbUser.auth_token_expires_at = new Date(); // needs to be a real expiration date
          dbUser.save();

          res.status(200).json({

          });
        }
      }).catch(function(err){
        res.status(500).json({msg:"error creating user" + err});
      });

  
  });

module.exports = router;
