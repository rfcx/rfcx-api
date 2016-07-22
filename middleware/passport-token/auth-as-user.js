var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var hash = require("../../utils/misc/hash.js").hash;
var regex = require("../../utils/misc/regex.js");

exports.authenticateAs = function(req,token,done,authUser){

  // TO DO 
  // need to specify how to exclude access to many irrelevant endpoints (like those intended for guardians)

  models.User
    .findOne({
        where: { guid: authUser.guid }, 
        include: [ { all: true } ]
    }).then(function(dbUser){

      if (dbUser.Token == null) {
        done(null, false, {message:"this user has no access tokens"});
        return null;
      } else {

        for (var i in dbUser.Token) {
          if (dbUser.Token.hasOwnProperty(i)) {

            if (dbUser.Token[i].auth_token_expires_at.valueOf() <= new Date()) {

              dbUser.Token[i]
                .destroy()
                .then(function () {
                  console.log("expired user token deleted");
                })
                .catch(function (err) {
                  console.log("failed to delete expired user token | " + err);
                });

            }
            else if ((dbUser.Token[i].auth_token_hash == hash.hashedCredentials(dbUser.Token[i].auth_token_salt, token)) &&
                     ((dbUser.Token[i].only_allow_access_to == null) ||
                     (regex.regExIndexOf(req.rfcx.url_path, JSON.parse(dbUser.Token[i].only_allow_access_to)) > -1))) {

              req.rfcx.auth_token_info = {
                type: "user",
                id: dbUser.Token[i].id,
                guid: dbUser.guid,
                owner_id: dbUser.id,
                owner_guid: dbUser.guid
              };

              if (verbose_logging) {
                console.log("authenticated as user " + req.rfcx.auth_token_info.guid);
              }
              done(null, req.rfcx.auth_token_info);
              return null;
            }

          }
        }
      }
      console.log("failed to match token with salted hash");
      done(null, false, {message:"invalid user/token combination"});
      return null;

    }).catch(function(err){
      console.log("failed to find user | "+JSON.stringify(err));
      done(err);
      return null;
    });

};

