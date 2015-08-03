var models  = require("../models");
var hash = require("../misc/hash.js").hash;
var TokenStrategy = require("passport-accesstoken").Strategy;

exports.strategy = function(){

    return new TokenStrategy({
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

          return authenticateAs.guardian(req,token,done,authUser);

        } else {

          // to be filled with other types of authenticating types, like Users / Workers, etc
          return done(null, false);
        }

      }
  );

};

var authenticateAs = {

  guardian: function(req,token,done,authUser){

    models.Guardian
      .findOne({ 
        where: { guid: authUser.guid }
      }).then(function(dbGuardian){
        var dbRow = dbGuardian;
        if  (   (dbGuardian != null)
            &&  (dbGuardian.auth_token_hash == hash.hashedCredentials(dbGuardian.auth_token_salt,token))
            ) {
              var userObj = {
                    type: "guardian",
                    id: dbGuardian.id,
                    guid: dbGuardian.guid,
                    name: dbGuardian.shortname
                  };
              console.log("authenticated as guardian "+userObj.guid);
              return done(null,userObj);
        } else {
          console.log("failed to match token with salted hash");
          return done(null, false, {message:"invalid user/token combination"});
        }
      }).catch(function(err){
        console.log("failed to find guardian | "+err);
        return done(err);
      });

  }

};

