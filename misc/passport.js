
var models  = require("../models");
var hash = require("../misc/hash.js").hash;
var TokenStrategy   = require("passport-accesstoken").Strategy;

exports.passport = {

  tokenStrategy:
    new TokenStrategy({
        tokenHeader: "x-rfcx-auth-token",
        tokenField: "rfcx-auth-token",
        passReqToCallback: true
      },
      function (req, token, done) {

        if (req.headers["x-rfcx-auth-user"] != null) {

          var userType = req.headers["x-rfcx-auth-user"].split("/")[0];
          var userGuid = req.headers["x-rfcx-auth-user"].split("/")[1];

          if (userType === "guardian") {

//            console.log(hash.hashedCredentials("salt",token));
            console.log(hash.randomHash(160));

          } else {

          }
        }

        return done(null, false);
        
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
              return done(null, user);
          // });
      }
    )

};
