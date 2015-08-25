var models  = require("../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../misc/hash.js").hash;
var token = require("../../misc/token.js").token;
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

router.route("/register")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var user_email = req.body.email,
        user_password = req.body.password,
        user_type = req.body.type
        ;

    models.User 
      .findOrCreate({
        where: { email: user_email }
      }).spread(function(dbUser, wasCreated){

        if (!wasCreated) {
          res.status(409).json({ 
            message: "A user with that username or email already exists", error: { status: 409 }
          });
        } else {

          dbUser.type = user_type;

          var password_salt = hash.randomHash(320);
          dbUser.auth_password_salt = password_salt;
          dbUser.auth_password_hash = hash.hashedCredentials(password_salt,user_password);
          dbUser.auth_password_updated_at = new Date();
          dbUser.save();

          token.createUserToken({
            token_type: "user-registration",
            created_by: "user-registration",
            reference_tag: dbUser.guid,
            owner_primary_key: dbUser.id,
            minutes_until_expiration: 1440
          }).then(function(tokenInfo){

            res.status(200).json({
              guid: dbUser.guid,
              token: tokenInfo.token
            });

          });

        }
      }).catch(function(err){
        console.log(err);
        res.status(500).json({
          message: err.message, error: { status: 500 }
        });
//        res.status(409).json({ message: "A user with that username or email already exists", error: { status: 409 } });
      });

  
  });

module.exports = router;
