var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  models.AnonymousToken
    .findOne({ 
      where: {
        guid: authUser.guid
      }
    }).then(function(dbToken){

      if (dbToken == null) {
        
        return done(null, false, {message:"invalid user/token combination"});

      } else if (dbToken.auth_token_expires_at.valueOf() <= new Date()) {
        
        dbToken.destroy().then(function(){
          return done(null, false, {message:"token is expired"});
        }).catch(function(err){
          console.log("failed to delete anonymous token, but proceeding anyway... | "+err);
          return done(null, false, {message:"token is expired"});
        });

      } else if (dbToken.auth_token_hash == hash.hashedCredentials(dbToken.auth_token_salt,token)){

        var userObj = {
              type: authUser.type,
              id: dbToken.id,
              guid: dbToken.guid,
              name: null
            };

        console.log("authenticated with anonymous token: "+userObj.guid);
        
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

