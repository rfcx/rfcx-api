/* eslint camelcase: "off" */
const Promise = require('bluebird')
const random = require('../../../common/crypto/random')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const models = require('../../_models')

exports.token = {

  createAnonymousToken: function (options) {
    return this.createToken('anonymous', options)
  },

  createRegistrationToken: function (options) {
    options.token_length = ((options.token_length == null) ? 4 : options.token_length)
    return this.createToken('registration', options)
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
  createToken: function (whatKindOfToken, options) {
    const // validate inputs and set certain defaults
      token_length = ((options.token_length == null) ? 40 : options.token_length)
    const reference_tag = ((options.reference_tag == null) ? null : options.reference_tag)
    const owner_primary_key = ((options.owner_primary_key == null) ? null : options.owner_primary_key)
    const token_type = ((options.token_type == null) ? null : options.token_type)
    const only_allow_access_to = ((options.only_allow_access_to == null) ? null : ((!Array.isArray(options.only_allow_access_to)) ? [options.only_allow_access_to] : options.only_allow_access_to))
    const created_by = ((options.created_by == null) ? null : options.created_by)
    const created_for = ((options.created_for == null) ? null : options.created_for) // only for registration tokens
    const allowed_redemptions = ((options.allowed_redemptions == null) ? null : options.allowed_redemptions) // only for registration tokens
    const allow_garbage_collection = ((options.allow_garbage_collection == null) ? false : options.allow_garbage_collection)

    const minutes_until_expiration = ((options.minutes_until_expiration == null) ? 15 : parseInt(options.minutes_until_expiration))
    const expires_at = new Date((new Date()).valueOf() + (1000 * 60 * minutes_until_expiration))

    const token = ((options.use_this_token_value == null) ? random.randomString(token_length) : options.use_this_token_value)
    const salt = random.randomString(62)
    const tokenHash = hashedCredentials(salt, token)

    const output_token = {
      reference_tag,
      owner_primary_key,
      token_type,
      token_guid: null,
      token,
      token_expires_at: expires_at,
      only_allow_access_to,
      created_for,
      allowed_redemptions,
      created_by
    }

    // build generic token (type-specific attributes to be added later)
    const dbTokenAttributes = {
      type: token_type,
      auth_token_salt: salt,
      auth_token_hash: tokenHash,
      auth_token_expires_at: expires_at,
      only_allow_access_to: ((only_allow_access_to == null) ? null : JSON.stringify(only_allow_access_to))
    }

    if (whatKindOfToken === 'anonymous') {
      dbTokenAttributes.created_by = created_by
    } else if (whatKindOfToken === 'user') {
      dbTokenAttributes.user_id = owner_primary_key
    } else if (whatKindOfToken === 'registration') {
      output_token.token_guid = random.randomString(token_length)
      dbTokenAttributes.guid = output_token.token_guid
      dbTokenAttributes.created_for = output_token.created_for
      dbTokenAttributes.allowed_redemptions = output_token.allowed_redemptions
    }

    if (allow_garbage_collection &&
      (Math.random() < 0.01) // only do garbage collection ~1% of the time it's allowed
    ) {
      this.destroyExpiredTokens(whatKindOfToken)
    }

    return this.saveToken(whatKindOfToken, dbTokenAttributes, output_token)
  },

  saveToken: function (whatKindOfToken, dbTokenAttributes, returnTokenObj) {
    return new Promise(function (resolve, reject) {
      if (whatKindOfToken === 'anonymous') {
        // create token in db
        return models.AnonymousToken
          .create(dbTokenAttributes)
          .then(function (dbToken) {
            try {
              returnTokenObj.token_guid = dbToken.guid
              return resolve(returnTokenObj)
            } catch (e) {
              reject(e)
            }
          }).catch(function (err) {
            console.error('failed to create anonymous token | ' + err)
            reject(new Error(err))
          })
      } else if (whatKindOfToken === 'registration') {
        // create token in db
        return models.RegistrationToken
          .create(dbTokenAttributes)
          .then(function (dbToken) {
            try {
              return resolve(returnTokenObj)
            } catch (e) {
              reject(e)
            }
          }).catch(function (err) {
            console.error('failed to create registration token | ' + err)
            reject(new Error(err))
          })
      } else {
        // no type specified, so reject
        reject(new Error())
      }
    })
  },

  destroyExpiredTokens: function (whatKindOfToken) {
    if (whatKindOfToken === 'anonymous') {
      return models.AnonymousToken
        .destroy({
          where: { auth_token_expires_at: { [models.Sequelize.Op.lt]: new Date() } }
        }).then(function (dbAffectedRows) {
          console.info("deleted expired 'anonymous' tokens")
          return null
        }).catch(function (err) {
          console.error(err)
        })
    } else if (whatKindOfToken === 'registration') {
      return models.RegistrationToken
        .destroy({
          where: { auth_token_expires_at: { [models.Sequelize.Op.lt]: new Date() } }
        }).then(function (dbAffectedRows) {
          console.info("deleted expired 'registration' tokens")
          return null
        }).catch(function (err) {
          console.error(err)
        })
    }
  }

}
