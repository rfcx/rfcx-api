var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authAsGuardian = function(req,token,done,authUser){

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
};

