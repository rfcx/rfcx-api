var hash = require("../misc/hash.js").hash;
var Promise = require("bluebird");
var models  = require("../models");

exports.token = {

  /**
	 * generate an access token, and register in database
	 *
   * @param {Object} options: {String} reference_id, {String} token_type, {Integer} minutes_until_expiration, {String} only_allow_access_to
	 * @return {Object} access_token: {String} reference_id, {String} token_type, {String} token_guid, {String} token, {Date} token_expires_at, {String} only_allow_access_to
	 * @api private
	 */
  createAuthToken: function(options) {
    
    var token = hash.randomToken(40),
        salt = hash.randomHash(320),
        tokenHash = hash.hashedCredentials(salt,token),
        
        // validate inputs and set certain defaults
        reference_id = ((options.reference_id == null) ? null : options.reference_id),
        token_type = ((options.token_type == null) ? null : options.token_type),
        only_allow_access_to = ((options.only_allow_access_to == null) ? null : options.only_allow_access_to),

        minutes_until_expiration = ((options.minutes_until_expiration == null) ? 15 : parseInt(options.minutes_until_expiration)),
        expires_at = new Date((new Date()).valueOf()+(1000*60*minutes_until_expiration)),

        access_token = {
            reference_id: reference_id,
            token_type: token_type,
            token_guid: null, 
            token: token, 
            token_expires_at: expires_at,
            only_allow_access_to: only_allow_access_to
          };
    
    return new Promise(function(resolve,reject){
      models.SingleUseToken
        .create({
          type: token_type,
          auth_token_salt: salt,
          auth_token_hash: tokenHash,
          auth_token_expires_at: expires_at,
          only_allow_access_to: only_allow_access_to
        }).then(function(dbToken){
          try {
            access_token.token_guid = dbToken.guid;
            resolve(access_token);
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

