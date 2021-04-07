const verboseLogging = (process.env.NODE_ENV !== 'production')
const models = require('../../models')
const hash = require('../../utils/misc/hash')
const regex = require('../../utils/misc/regex.js')

exports.authenticateAs = function (req, token, done, authUser) {
  const onlyAllowAccessTo = [
    '^/v1/guardians/' + authUser.guid + '/checkins$',
    '^/v1/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/pings$'
  ]

  models.Guardian
    .findOne({
      where: { guid: authUser.guid }
    }).then(function (dbGuardian) {
      const requestFullUrl = new URL(req.rfcx.url_path, process.env.REST_PROTOCOL + '://' + process.env.REST_HOST)
      if (dbGuardian == null) {
        return done(null, false, { message: "this guardian doesn't exist in the database" })
      } else if ((dbGuardian.auth_token_hash === hash.hashedCredentials(dbGuardian.auth_token_salt, token)) &&
        (regex.regExIndexOf(requestFullUrl.pathname, onlyAllowAccessTo) > -1)
      ) {
        req.rfcx.auth_token_info = {
          type: 'guardian',
          id: dbGuardian.id,
          guid: dbGuardian.guid,
          owner_id: dbGuardian.id,
          owner_guid: dbGuardian.guid
        }

        if (verboseLogging) { console.log('authenticated as guardian ' + req.rfcx.auth_token_info.guid) }
        return done(null, req.rfcx.auth_token_info)
      } else {
        console.log('failed to match token with salted hash')
        return done(null, false, { message: 'invalid guardian/token combination' })
      }
    }).catch(function (err) {
      console.log('failed to find guardian | ' + err)
      return done(err)
    })
}
