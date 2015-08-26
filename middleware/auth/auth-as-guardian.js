var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  var only_allow_access_to = [
      "/v1/guardians/"+authUser.guid+"/checkins",
      "/v1/guardians/"+authUser.guid+"/software/all/latest",
      "/v1/guardians/"+authUser.guid+"/software/updater/latest"
    ];

  models.Guardian
    .findOne({ 
      where: { guid: authUser.guid }
    }).then(function(dbGuardian){
      if (dbGuardian == null) {

        return done(null, false, {message:"this guardian doesn't exist in the database"});

      } else if (   (dbGuardian.auth_token_hash == hash.hashedCredentials(dbGuardian.auth_token_salt,token))
                &&  (only_allow_access_to.indexOf(req.rfcx.url_path) > -1)
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
        return done(null, false, {message:"invalid guardian/token combination"});
      }

    }).catch(function(err){
      console.log("failed to find guardian | "+err);
      return done(err);
    });
};

