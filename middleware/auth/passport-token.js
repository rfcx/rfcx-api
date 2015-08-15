var TokenStrategy = require("passport-accesstoken").Strategy;

var authenticateAs = {
  Guardian: require("./auth-as-guardian.js").authAsGuardian,
  Worker: require("./auth-as-worker.js").authAsWorker
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

        if (authUser.type === "guardian") {
          return authenticateAs.Guardian(req,token,done,authUser);
        } else if (authUser.type === "worker") {
          return authenticateAs.Worker(req,token,done,authUser);
        } else {
          // to be filled with other types of authenticating types, like Users / Workers, etc
          return done(null, false);
        }

    });

