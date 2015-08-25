var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){

  models.User
    .findOne({
        where: { guid: authUser.guid }, 
        include: [ { all: true } ]
    }).then(function(dbUser){

      if (dbUser.Token == null) {
        return done(null, false, {message:"this user has no access tokens"});

      } else {

        for (i in dbUser.Token) {

          if (dbUser.Token[i].auth_token_expires_at.valueOf() <= new Date()) {
            dbUser.Token[i].destroy().then(function(){
              console.log("expired user token deleted");
            }).catch(function(err){
              console.log("failed to delete expired user token | "+err);
            });
          } else if (   (dbUser.Token[i].auth_token_hash == hash.hashedCredentials(dbUser.Token[i].auth_token_salt,token)) 
                    &&  (   (dbUser.Token[i].only_allow_access_to == null)
                        ||  (dbUser.Token[i].only_allow_access_to.split("|").indexOf(req.rfcx.url_path) > -1)
                        )
                    ) {

            var userObj = {
                  type: "user",
                  id: dbUser.id,
                  guid: dbUser.guid,
                  name: dbUser.username
                };

            console.log("authenticated as user "+userObj.guid);
            return done(null,userObj);
          }
        }
      }
      console.log("failed to match token with salted hash");
      return done(null, false, {message:"invalid user/token combination"});

    }).catch(function(err){
      console.log("failed to find user | "+JSON.stringify(err));
      return done(err);
    });

};

