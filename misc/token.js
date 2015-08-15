var hash = require("../misc/hash.js").hash;
var Promise = require("bluebird");
var models  = require("../models");

exports.token = {

  /**
	 * generate an access token, and register in database
	 *
   * @param {String} type
	 * @param {Integer} number_of_uses
	 * @return {Object} token_guid and token
	 * @api private
	 */
  createAuthToken: function(reference_id,type,number_of_uses) {
    var token = hash.randomToken(40),
        salt = hash.randomHash(320),
        tokenHash = hash.hashedCredentials(salt,token),
        tokenInfo = {
            id: reference_id,
            token_guid: null, 
            token: token, 
            token_expires_at: null
          };
    
    return new Promise(function(resolve,reject){
      models.MiscAuthToken
        .create({
          type: type,
          remaining_uses: number_of_uses,
          auth_token_salt: salt,
          auth_token_hash: tokenHash,
          auth_token_updated_at: new Date(),
          auth_token_expires_at: new Date()
        }).then(function(dbToken){
          try {
            tokenInfo.token_guid = dbToken.guid;
            tokenInfo.token_expires_at = dbToken.auth_token_expires_at;
            resolve(tokenInfo);
          } catch (e) {
            reject(e);
          }
        }).catch(function(err){
          console.log("failed to create token | "+err);
          reject(new Error(err));
        });
    });

  },
  
};

