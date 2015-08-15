var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authAsWorker = function(req,token,done,authUser){

  models.MiscAuthToken
    .findOne({ 
      where: { guid: authUser.guid }
    }).then(function(dbToken){
      if  (   (dbToken != null)
          &&  (dbToken.auth_token_hash == hash.hashedCredentials(dbToken.auth_token_salt,token))
          ) {
            var userObj = {
                  type: "guardian",
                  id: dbToken.id,
                  guid: dbToken.guid,
                  name: null
                };
            console.log("authenticated as worker using token with guid "+userObj.guid);
            return done(null,userObj);
      } else {
        console.log("failed to match token with salted hash");
        return done(null, false, {message:"invalid user/token combination"});
      }
    }).catch(function(err){
      console.log("failed to find misc token | "+err);
      return done(err);
    });
};

