var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  models.AnonymousToken
    .findOne({ 
      where: {
        guid: authUser.guid,
        auth_token_expires_at: { $gt: new Date() }
      }
    }).then(function(dbToken){
      if  (   (dbToken != null)
          &&  (dbToken.auth_token_hash == hash.hashedCredentials(dbToken.auth_token_salt,token))
          ) {

            var userObj = {
                  type: authUser.type,
                  id: dbToken.id,
                  guid: dbToken.guid,
                  name: null
                };

            console.log("authenticated with anonymous token: "+userObj.guid);

            dbToken.remaining_uses--;
            dbToken.save();

            if (dbToken.remaining_uses == 0) {
              dbToken.destroy().then(function(){
                return done(null,userObj);
              }).catch(function(err){
               console.log("failed to delete anonymous token, but proceeding with login anyway... | "+err);
                return done(null,userObj);
              });
            } else {
              return done(null,userObj);
            }

      } else {
        console.log("failed to match token with salted hash");
        return done(null, false, {message:"invalid user/token combination"});
      }
    }).catch(function(err){
      console.log("failed to find misc token | "+err);
      return done(err);
    });
};

