const verboseLogging = (process.env.NODE_ENV !== 'production')
const models = require('../../../noncore/_models')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const regex = require('./utils/regex')

exports.authenticateAs = function (req, token, done, authUser) {
  const onlyAllowAccessTo = [
    '^/v1/guardians/' + authUser.guid + '/checkins$',
    '^/v1/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/pings$'
  ]
  const path = req.baseUrl + req.path

  models.Guardian
    .findOne({
      where: { guid: authUser.guid }
    }).then(function (dbGuardian) {
      if (dbGuardian == null) {
        return done(null, false, { message: "this guardian doesn't exist in the database" })
      } else if (regex.regExIndexOf(path, onlyAllowAccessTo) === -1) {
        console.warn(`Invalid path for auth as guardian: ${path}`)
        return done(null, false, { message: 'invalid guardian/token combination' })
      } else if (dbGuardian.auth_token_hash === hashedCredentials(dbGuardian.auth_token_salt, token)) {
        req.rfcx.auth_token_info = {
          type: 'guardian',
          id: dbGuardian.id,
          guid: dbGuardian.guid,
          owner_id: dbGuardian.id,
          owner_guid: dbGuardian.guid
        }
        if (verboseLogging) { console.info('authenticated as guardian ' + req.rfcx.auth_token_info.guid) }
        return done(null, req.rfcx.auth_token_info)
      } else {
        console.warn('Invalid token for auth as guardian: failed to match token with salted hash')
        return done(null, false, { message: 'invalid guardian/token combination' })
      }
    }).catch(function (err) {
      console.warn('failed to find guardian | ' + err)
      return done(err)
    })
}
