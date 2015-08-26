var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  // The input 'token' (invite code) is actually the guid and token, concatenated.
  // These two should be the same length, so we break the token in half and use each part.
  var inviteGuid = token.substr(0,Math.floor(token.length/2)),
      inviteToken = token.substr(Math.floor(token.length/2));

  models.RegistrationToken
    .findOne({
      where: {
        guid: inviteGuid
      }
    }).then(function(dbToken){
      if (dbToken == null) {
        
        return done(null, false, {message:"invalid code/token combination"});

      } else if (dbToken.auth_token_expires_at.valueOf() <= new Date()) {
        
        dbToken.destroy().then(function(){
          return done(null, false, {message:"code/token is expired"});
        }).catch(function(err){
          console.log("failed to delete registration code/token, but proceeding anyway... | "+err);
          return done(null, false, {message:"code/token is expired"});
        });

      } else if (   (dbToken.auth_token_hash == hash.hashedCredentials(dbToken.auth_token_salt,inviteToken)) 
                &&  (   (dbToken.only_allow_access_to == null)
                    ||  (dbToken.only_allow_access_to.split("|").indexOf(req.rfcx.url_path) > -1)
                    )
                ) {

        var userObj = {
              type: authUser.type,
              id: dbToken.id,
              guid: inviteGuid,
              name: null
            };

        console.log("authenticated with registration code/token: "+userObj.guid);
        
        return done(null,userObj);
            
      } else {
        console.log("failed to match token with salted hash");
        return done(null, false, {message:"invalid user/token combination"});
      }
    }).catch(function(err){
      console.log("failed to find anonymous token | "+err);
      return done(err);
    });
};

