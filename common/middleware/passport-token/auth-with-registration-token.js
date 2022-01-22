const models = require('../../../noncore/_models')
const hash = require('../../../utils/misc/hash')
const regex = require('./utils/regex')

exports.authenticateAs = function (req, token, done, authUser) {
  // The input 'token' (invite code) is actually the guid and token, concatenated.
  // These two should be the same length, so we break the token in half and use each part.
  const inviteGuid = token.substr(0, Math.floor(token.length / 2)).toLowerCase()
  const inviteToken = token.substr(Math.floor(token.length / 2)).toLowerCase()

  models.RegistrationToken
    .findOne({
      where: {
        guid: inviteGuid
      }
    }).then(function (dbToken) {
      if (dbToken == null) {
        return done(null, false, { message: 'invalid code/token combination' })
      } else if (dbToken.auth_token_expires_at.valueOf() <= new Date()) {
        dbToken.destroy().then(function () {
          return done(null, false, { message: 'code/token is expired' })
        }).catch(function (err) {
          console.log('failed to delete registration code/token, but proceeding anyway... | ' + err)
          return done(null, false, { message: 'code/token is expired' })
        })
      } else if (dbToken.total_redemptions >= dbToken.allowed_redemptions) {
        return done(null, false, { message: 'invitation code has already been redeemed ' + dbToken.total_redemptions + ' time(s)' })
      } else if ((dbToken.auth_token_hash === hash.hashedCredentials(dbToken.auth_token_salt, inviteToken)) &&
        ((dbToken.only_allow_access_to == null) ||
          (regex.regExIndexOf(req.baseUrl + req.path, JSON.parse(dbToken.only_allow_access_to)) > -1)
        )
      ) {
        req.rfcx.auth_token_info = {
          type: 'registration',
          id: dbToken.id,
          guid: dbToken.guid,
          owner_id: null,
          owner_guid: null
        }

        console.log('authenticated with registration code/token: ' + req.rfcx.auth_token_info.guid)

        dbToken.increment('total_redemptions', { by: 1 })

        return done(null, req.rfcx.auth_token_info)
      } else {
        console.log('failed to match token with salted hash')
        return done(null, false, { message: 'invalid user/token combination' })
      }
    }).catch(function (err) {
      console.log('failed to find anonymous token | ' + err)
      return done(err)
    })
}
