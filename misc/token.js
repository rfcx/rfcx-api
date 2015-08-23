var hash = require("../misc/hash.js").hash;
var Promise = require("bluebird");
var models  = require("../models");

exports.token = {

  /**
	 * generate an access token, and register in database
	 *
   * @param {Object}  options:
   *                  {String} reference_id 
   *                  {String} token_type
   *                  {Integer} minutes_until_expiration
   *                  {Integer} max_uses
   *                  {String} only_allow_access_to
   *                  {String} created_by
	 * @return {Object} access_token
   *                  {String} reference_id
   *                  {String} token_type
   *                  {Date} token_expires_at
   *                  {String} only_allow_access_to
   *                  {Integer} remaining_uses
   *                  {String} created_by
   *                  {String} token_guid
   *                  {String} token
	 * @api private
	 */
  createAnonymousToken: function(options) {
    
    var token = hash.randomToken(40),
        salt = hash.randomHash(320),
        tokenHash = hash.hashedCredentials(salt,token),
        
        // validate inputs and set certain defaults
        reference_id = ((options.reference_id == null) ? null : options.reference_id),
        token_type = ((options.token_type == null) ? null : options.token_type),
        only_allow_access_to = ((options.only_allow_access_to == null) ? null : options.only_allow_access_to),
        created_by = ((options.created_by == null) ? null : options.created_by),
        max_uses = ((options.max_uses == null) ? 1 : options.max_uses),

        minutes_until_expiration = ((options.minutes_until_expiration == null) ? 15 : parseInt(options.minutes_until_expiration)),
        expires_at = new Date((new Date()).valueOf()+(1000*60*minutes_until_expiration)),

        access_token = {
            reference_id: reference_id,
            token_type: token_type,
            token_guid: null, 
            token: token, 
            token_expires_at: expires_at,
            only_allow_access_to: only_allow_access_to,
            remaining_uses: max_uses,
            created_by: created_by
          };
    
    return new Promise(function(resolve,reject){
      models.AnonymousToken
        .create({
          type: token_type,
          auth_token_salt: salt,
          auth_token_hash: tokenHash,
          auth_token_expires_at: expires_at,
          only_allow_access_to: only_allow_access_to,
          max_uses: max_uses,
          created_by: created_by
        }).then(function(dbToken){
          try {
            access_token.token_guid = dbToken.guid;
            resolve(access_token);
          } catch (e) {
            reject(e);
          }
        }).catch(function(err){
          console.log("failed to create anonymous token | "+err);
          reject(new Error(err));
        });
    });

  },
  
};

