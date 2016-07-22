var util = require("util");
var Promise = require("bluebird");
var hash = require("../../utils/misc/hash.js").hash;
var models = require("../../models");

exports.token = {

  createAnonymousToken: function (options) {
    return this.createToken("anonymous", options);
  },

  createUserToken: function (options) {
    return this.createToken("user", options);
  },

  createRegistrationToken: function (options) {
    options.token_length = ((options.token_length == null) ? 4 : options.token_length);
    return this.createToken("registration", options);
  },

  /**
   * generate an access token, and register in database
   *
   * @param {Object}  options:
   *                  {String} use_this_token_value
   *                  {Integer} token_length
   *                  {String} reference_tag
   *                  {Integer} owner_primary_key
   *                  {String} token_type
   *                  {Integer} minutes_until_expiration
   *                  {Array} only_allow_access_to
   *                  {String} created_by
   *                  {String} created_for
   *                  {Integer} allowed_redemptions
   *                  {Boolean} allow_garbage_collection
   * @return {Object} output_token
   *                  {String} token
   *                  {String} reference_tag
   *                  {String} token_type
   *                  {Date} token_expires_at
   *                  {Array} only_allow_access_to
   *                  {String} created_by
   *                  {String} created_for
   *                  {Integer} allowed_redemptions
   *                  {String} token_guid
   * @api private
   */
  createToken: function (what_kind_of_token, options) {

    var // validate inputs and set certain defaults
      token_length = ((options.token_length == null) ? 40 : options.token_length),
      reference_tag = ((options.reference_tag == null) ? null : options.reference_tag),
      owner_primary_key = ((options.owner_primary_key == null) ? null : options.owner_primary_key),
      token_type = ((options.token_type == null) ? null : options.token_type),
      only_allow_access_to = ((options.only_allow_access_to == null) ? null : ((!util.isArray(options.only_allow_access_to)) ? [options.only_allow_access_to] : options.only_allow_access_to)),
      created_by = ((options.created_by == null) ? null : options.created_by),
      created_for = ((options.created_for == null) ? null : options.created_for), // only for registration tokens
      allowed_redemptions = ((options.allowed_redemptions == null) ? null : options.allowed_redemptions), // only for registration tokens
      allow_garbage_collection = ((options.allow_garbage_collection == null) ? false : options.allow_garbage_collection),

      minutes_until_expiration = ((options.minutes_until_expiration == null) ? 15 : parseInt(options.minutes_until_expiration)),
      expires_at = new Date((new Date()).valueOf() + (1000 * 60 * minutes_until_expiration)),

      token = ((options.use_this_token_value == null) ? hash.randomString(token_length) : options.use_this_token_value),
      salt = hash.randomHash(320),
      tokenHash = hash.hashedCredentials(salt, token),

      output_token = {
        reference_tag: reference_tag,
        owner_primary_key: owner_primary_key,
        token_type: token_type,
        token_guid: null,
        token: token,
        token_expires_at: expires_at,
        only_allow_access_to: only_allow_access_to,
        created_for: created_for,
        allowed_redemptions: allowed_redemptions,
        created_by: created_by
      };

    // build generic token (type-specific attributes to be added later)
    var dbTokenAttributes = {
      type: token_type,
      auth_token_salt: salt,
      auth_token_hash: tokenHash,
      auth_token_expires_at: expires_at,
      only_allow_access_to: ((only_allow_access_to == null) ? null : JSON.stringify(only_allow_access_to))
    };

    if (what_kind_of_token === "anonymous") {
      dbTokenAttributes.created_by = created_by;
    } else if (what_kind_of_token === "user") {
      dbTokenAttributes.user_id = owner_primary_key;
    } else if (what_kind_of_token === "registration") {
      output_token.token_guid = hash.randomString(token_length);
      dbTokenAttributes.guid = output_token.token_guid;
      dbTokenAttributes.created_for = output_token.created_for;
      dbTokenAttributes.allowed_redemptions = output_token.allowed_redemptions;
    }

    if (allow_garbage_collection
      && (Math.random() < 0.01 ? true : false) // only do garbage collection ~1% of the time it's allowed
    ) {
      this.destroyExpiredTokens(what_kind_of_token);
    }

    return this.saveToken(what_kind_of_token, dbTokenAttributes, output_token);

  },


  saveToken: function (what_kind_of_token, dbTokenAttributes, returnTokenObj) {

    return new Promise(function (resolve, reject) {

      if (what_kind_of_token === "anonymous") {
        // create token in db
        return models.AnonymousToken
          .create(dbTokenAttributes)
          .then(function (dbToken) {
            try {
              returnTokenObj.token_guid = dbToken.guid;
              return resolve(returnTokenObj);
            } catch (e) {
              reject(e);
            }
          }).catch(function (err) {
            console.log("failed to create anonymous token | " + err);
            reject(new Error(err));
          });

      } else if (what_kind_of_token === "user") {
        // create token in db
        return models.UserToken
          .create(dbTokenAttributes)
          .then(function (dbToken) {
            try {
              return resolve(returnTokenObj);
            } catch (e) {
              reject(e);
            }
          }).catch(function (err) {
            console.log("failed to create user token | " + err);
            reject(new Error(err));
          });

      } else if (what_kind_of_token === "registration") {
        // create token in db
        return models.RegistrationToken
          .create(dbTokenAttributes)
          .then(function (dbToken) {
            try {
              return resolve(returnTokenObj);
            } catch (e) {
              reject(e);
            }
          }).catch(function (err) {
            console.log("failed to create registration token | " + err);
            reject(new Error(err));
          });

      } else {
        // no type specified, so reject
        reject(new Error());
      }
    });

  },

  destroyExpiredTokens: function (what_kind_of_token) {

    if (what_kind_of_token === "anonymous") {
      return models.AnonymousToken
        .destroy({
          where: {auth_token_expires_at: {$lt: new Date()}}
        }).then(function (dbAffectedRows) {
          console.log("deleted expired 'anonymous' tokens");
          return null;
        }).catch(function (err) {
          console.log(err);
        });

    } else if (what_kind_of_token === "user") {
      return models.UserToken
        .destroy({
          where: {auth_token_expires_at: {$lt: new Date()}}
        }).then(function (dbAffectedRows) {
          console.log("deleted expired 'user' tokens");
          return null;
        }).catch(function (err) {
          console.log(err);
        });

    } else if (what_kind_of_token === "registration") {
      return models.RegistrationToken
        .destroy({
          where: {auth_token_expires_at: {$lt: new Date()}}
        }).then(function (dbAffectedRows) {
          console.log("deleted expired 'registration' tokens");
          return null;
        }).catch(function (err) {
          console.log(err);
        });
    }

  }

};

