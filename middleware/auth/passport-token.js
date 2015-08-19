var TokenStrategy = require("passport-accesstoken").Strategy;

var authenticateAs = {
  Guardian: require("./auth-as-guardian.js").authenticateAs,
  User: require("./auth-as-user.js").authenticateAs,
  SingleUseToken: require("./auth-with-single-use-token.js").authenticateAs
};

exports.TokenStrategy = 

    new TokenStrategy({
        tokenHeader: "x-auth-token",
        tokenField: "auth_token",
        tokenParams: "auth_token",
        tokenQuery: "auth_token",
        passReqToCallback: true
      }, function(req,token,done){

        // parses auth_user from req.rfcx...
        // the way this is being done should probably be consolidated or re-considered
        var authUser = { type: null, guid: null };
        for (i in req.rfcx.auth_user) {
          if ((req.rfcx.auth_user[i] != null) && (req.rfcx.auth_user[i].indexOf("/") > 0 )) {
            authUser = {
              type: req.rfcx.auth_user[i].split("/")[0].toLowerCase(),
              guid: req.rfcx.auth_user[i].split("/")[1].toLowerCase()
            }; break;
          }
        }

        switch(authUser.type) {

          case "guardian":
            return authenticateAs.Guardian(req,token,done,authUser);
            break;

          case "user":
            return authenticateAs.User(req,token,done,authUser);
            break;
          
          case "single-use":
            return authenticateAs.SingleUseToken(req,token,done,authUser);
            break;
          
          default:
            return done(null, false)
        }

    });

