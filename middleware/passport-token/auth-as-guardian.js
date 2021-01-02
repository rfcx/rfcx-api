var verboseLogging = (process.env.NODE_ENV !== 'production')
var models = require('../../models')
var hash = require('../../utils/misc/hash.js').hash
var regex = require('../../utils/misc/regex.js')
var url = require('url')

exports.authenticateAs = function (req, token, done, authUser) {
  var onlyAllowAccessTo = [
    '^/v1/guardians/' + authUser.guid + '/checkins$',
    '^/v1/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/software/[a-z]+$',
    '^/v2/guardians/' + authUser.guid + '/pings$'
  ]

  models.Guardian
    .findOne({
      where: { guid: authUser.guid }
    }).then(function (dbGuardian) {
      if (dbGuardian == null) {
        return done(null, false, { message: "this guardian doesn't exist in the database" })
      } else if ((dbGuardian.auth_token_hash === hash.hashedCredentials(dbGuardian.auth_token_salt, token)) &&
                (regex.regExIndexOf(url.parse(req.rfcx.url_path).pathname, onlyAllowAccessTo) > -1)
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
