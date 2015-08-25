var models  = require("../../models");
var hash = require("../../misc/hash.js").hash;

exports.authenticateAs = function(req,token,done,authUser){


  models.User
    .findOne({
        where: { guid: authUser.guid }, 
        include: [ { all: true } ]
    }).then(function(dbUser){

      console.log(dbUser.Token);



    }).catch(function(err){
      console.log("failed to find user | "+err);
      return done(err);
    });


  // models.UserToken
  //   .findOne({ 
  //     where: { 
  //       user_id: 1 
  //     }
  //   }).then(function(dbUserToken){
  //     if (dbUserToken == null) {
        
  //       return done(null, false, {message:"invalid user/token combination"});

  //     } else if (dbUserToken.auth_token_expires_at.valueOf() <= new Date()) {
        
  //       dbUserToken.destroy().then(function(){
  //         return done(null, false, {message:"token is expired"});
  //       }).catch(function(err){
  //         console.log("failed to delete user token, but proceeding anyway... | "+err);
  //         return done(null, false, {message:"token is expired"});
  //       });

  //     } else if (   (dbUserToken.auth_token_hash == hash.hashedCredentials(dbUserToken.auth_token_salt,token))
                


  //               ) {

  //       var userObj = {
  //             type: "user",
  //             id: dbUser.id,
  //             guid: dbUser.guid,
  //             name: dbUser.name
  //           };

  //       console.log("authenticated as user "+userObj.guid);
        
  //       return done(null,userObj);

  //     } else {
  //       console.log("failed to match token with salted hash");
  //       return done(null, false, {message:"invalid user/token combination"});
  //     }
  //   }).catch(function(err){
  //     console.log("failed to find user | "+err);
  //     return done(err);
  //   });
};

