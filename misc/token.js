var hash = require("../misc/hash.js").hash;
var Promise = require("bluebird");
var models  = require("../models");

exports.token = {

  createAnonymousToken: function(options) {
    return this.createToken("anonymous", options);
  },

  createUserToken: function(options) {
    return this.createToken("user", options);
  },

  /**
	 * generate an access token, and register in database
	 *
   * @param {Object}  options:
   *                  {String} token
   *                  {Integer} token_length
   *                  {String} reference_tag
   *                  {Integer} owner_primary_key
   *                  {String} token_type
   *                  {Integer} minutes_until_expiration
   *                  {String} only_allow_access_to
   *                  {String} created_by
	 * @return {Object} output_token
   *                  {String} token
   *                  {String} reference_tag
   *                  {String} token_type
   *                  {Date} token_expires_at
   *                  {String} only_allow_access_to
   *                  {String} created_by
   *                  {String} token_guid
	 * @api private
	 */
  createToken: function(what_kind_of_token, options) {
    
    var // validate inputs and set certain defaults
        token_length = ((options.token_length == null) ? 40 : options.token_length),
        reference_tag = ((options.reference_tag == null) ? null : options.reference_tag),
        owner_primary_key = ((options.owner_primary_key == null) ? null : options.owner_primary_key),
        token_type = ((options.token_type == null) ? null : options.token_type),
        only_allow_access_to = ((options.only_allow_access_to == null) ? null : options.only_allow_access_to),
        created_by = ((options.created_by == null) ? null : options.created_by),

        minutes_until_expiration = ((options.minutes_until_expiration == null) ? 15 : parseInt(options.minutes_until_expiration)),
        expires_at = new Date((new Date()).valueOf()+(1000*60*minutes_until_expiration)),

        token = ((options.token == null) ? hash.randomString(token_length) : options.token),
        salt = hash.randomHash(320),
        tokenHash = hash.hashedCredentials(salt,token),

        output_token = {
            reference_tag: reference_tag,
            owner_primary_key: owner_primary_key,
            token_type: token_type,
            token_guid: null, 
            token: token, 
            token_expires_at: expires_at,
            only_allow_access_to: only_allow_access_to,
            created_by: created_by
          };

      // build generic token (type-specific attributes to be added later)
      var dbTokenAttributes = {
            type: token_type,
            auth_token_salt: salt,
            auth_token_hash: tokenHash,
            auth_token_expires_at: expires_at,
            only_allow_access_to: only_allow_access_to
      };

      if (what_kind_of_token === "anonymous") {
        dbTokenAttributes.created_by = created_by;
      } else if (what_kind_of_token === "user") {
        dbTokenAttributes.user_id = owner_primary_key;
      }

      return this.saveToken(what_kind_of_token, dbTokenAttributes, output_token);

  },


  saveToken: function(what_kind_of_token, dbTokenAttributes, returnTokenObj) {

    return new Promise(function(resolve,reject){

      if (what_kind_of_token === "anonymous") {
        // create token in db
        models.AnonymousToken
          .create(dbTokenAttributes).then(function(dbToken){
            try {
              returnTokenObj.token_guid = dbToken.guid;
              resolve(returnTokenObj);
            } catch (e) { reject(e); }
          }).catch(function(err){
            console.log("failed to create anonymous token | "+err);
            reject(new Error(err));
          });

      } else if (what_kind_of_token === "user") {
        // create token in db
        models.UserToken
          .create(dbTokenAttributes).then(function(dbToken){
            try {
              resolve(returnTokenObj);
            } catch (e) { reject(e); }
          }).catch(function(err){
            console.log("failed to create anonymous token | "+err);
            reject(new Error(err));
          });

      } else {
        // no type specified, so reject
        reject(new Error());
      }
    });

  }
  
};

