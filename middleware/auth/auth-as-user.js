var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  models.User
    .findOne({ 
      where: { guid: authUser.guid }
    }).then(function(dbUser){
      if  (   (dbUser != null)
          &&  (dbUser.auth_token_hash == hash.hashedCredentials(dbUser.auth_token_salt,token))
          ) {
            var userObj = {
                  type: "user",
                  id: dbUser.id,
                  guid: dbUser.guid,
                  name: dbUser.name
                };
            console.log("authenticated as user "+userObj.guid);
            return done(null,userObj);
      } else {
        console.log("failed to match token with salted hash");
        return done(null, false, {message:"invalid user/token combination"});
      }
    }).catch(function(err){
      console.log("failed to find user | "+err);
      return done(err);
    });
};

