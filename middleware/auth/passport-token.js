var TokenStrategy = require("passport-accesstoken").Strategy;

var authenticateAs = {
  Guardian: require("./auth-as-guardian.js").authenticateAs,
  User: require("./auth-as-user.js").authenticateAs,
  RegistrationToken: require("./auth-with-registration-token.js").authenticateAs,
  AnonymousToken: require("./auth-with-anonymous-token.js").authenticateAs
};

exports.TokenStrategy = 

    new TokenStrategy({
        tokenHeader: "x-auth-token",
        tokenField: "auth_token",
        tokenParams: "auth_token",
        tokenQuery: "auth_token",
        passReqToCallback: true
      }, function(req,token,done){

        var user_auth_types = [ "token", "user", "guardian", "register" ];

        // parses auth_user from req.rfcx...
        // the way this is being done should probably be consolidated or re-considered
        var authUser = { type: null, guid: null };
        for (i in req.rfcx.auth_user) {
          if (  (req.rfcx.auth_user[i] != null) && (req.rfcx.auth_user[i].indexOf("/") > 0 )) {
            authUser.type = req.rfcx.auth_user[i].split("/")[0].toLowerCase();
            authUser.guid = req.rfcx.auth_user[i].split("/")[1].toLowerCase();
            break;
          } else if (req.rfcx.auth_user[i] != null) {
            authUser.type = req.rfcx.auth_user[i];
            break;
          }
        }

        switch(authUser.type) {
          
          case "token":
            return authenticateAs.AnonymousToken(req,token,done,authUser);
            break;

          case "user":
            return authenticateAs.User(req,token,done,authUser);
            break;
            
          case "guardian":
            return authenticateAs.Guardian(req,token,done,authUser);
            break;
            
          case "register":
            return authenticateAs.RegistrationToken(req,token,done,authUser);
            break;
          
          default:
            return done(null, false)
        }

    });

