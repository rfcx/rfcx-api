var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authWithMiscToken = function(req,token,done,authUser){

  models.SingleUseToken
    .findOne({ 
      where: {
        guid: authUser.guid,
  //      auth_token_expires_at: 
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

            console.log("authenticated as "+authUser.type+" using token with token guid "+userObj.guid);

            dbToken.remaining_uses = dbToken.remaining_uses - 1;
            dbToken.save();

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

