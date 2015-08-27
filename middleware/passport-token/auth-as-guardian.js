var models  = require("../../models");
var hash = require("../../utils/hash.js").hash;
var misc = require("../../utils/misc.js");

exports.authenticateAs = function(req,token,done,authUser){

  var only_allow_access_to = [
      "^/v1/guardians/"+authUser.guid+"/checkins$",
      "^/v1/guardians/"+authUser.guid+"/software/[a-z]+/latest$"
    ];

  models.Guardian
    .findOne({ 
      where: { guid: authUser.guid }
    }).then(function(dbGuardian){
      if (dbGuardian == null) {

        return done(null, false, {message:"this guardian doesn't exist in the database"});

      } else if (   (dbGuardian.auth_token_hash == hash.hashedCredentials(dbGuardian.auth_token_salt,token))
                &&  (misc.regExIndexOf(req.rfcx.url_path, only_allow_access_to) > -1)
          ) {

            req.rfcx.auth_token_info = {
              type: "guardian",
              id: dbGuardian.id,
              guid: dbGuardian.guid
            };

            console.log("authenticated as guardian "+req.rfcx.auth_token_info.guid);
            return done(null,req.rfcx.auth_token_info);

      } else {
        console.log("failed to match token with salted hash");
        return done(null, false, {message:"invalid guardian/token combination"});
      }

    }).catch(function(err){
      console.log("failed to find guardian | "+err);
      return done(err);
    });
};

