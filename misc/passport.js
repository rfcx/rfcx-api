
var models  = require("../models");
var hash = require("../misc/hash.js").hash;
var TokenStrategy   = require("passport-accesstoken").Strategy;

exports.passport = {

  tokenStrategy:
    new TokenStrategy({
        tokenHeader: "x-auth-token",
        tokenField: "auth-token",
        passReqToCallback: true
      },
      function (req, token, done) {

        if (req.headers["x-auth-user"] != null) {

          var xAuthUser = req.headers["x-auth-user"];
          var userType = xAuthUser.split("/")[0];
          var userGuid = xAuthUser.split("/")[1];

          if (userType === "guardian") {
            models.Guardian
              .findOne({ 
                where: { guid: userGuid }
              }).then(function(dbGuardian){
                var dbRow = dbGuardian;
                if (dbRow.auth_token_hash == hash.hashedCredentials(dbRow.auth_token_salt,token)) {
                  return done(null,{
                    type: "guardian",
                    id: dbRow.id,
                    guid: dbRow.guid,
                    name: dbRow.shortname
                  });
                } else {
                  console.log("failed to match token with salted hash | "+err);
                  return done(null, false);
                }
              }).catch(function(err){
                console.log("failed to find guardian | "+err);
                return done(null, err);
              });
          } else {

          }
        }

   //     return done(null, false);
        
          // User.findOne({token: token}, function (err, user) {
              // if (err) {
              //     return done(err);
              // }

              // if (!user) {
              //     return done(null, false);
              // }

              // if (!user.verifyToken(token)) {
              //     return done(null, false);
              // }
              
          // });
      }
    )

};
