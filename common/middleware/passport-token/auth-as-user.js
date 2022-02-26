const verboseLogging = (process.env.NODE_ENV !== 'production')
const models = require('../../../noncore/_models')
const { hashedCredentials } = require('../../../common/crypto/sha256')
const regex = require('./utils/regex')

exports.authenticateAs = function (req, token, done, authUser) {
  // TO DO
  // need to specify how to exclude access to many irrelevant endpoints (like those intended for guardians)

  models.User
    .findOne({
      where: { guid: authUser.guid },
      include: [{ all: true }]
    }).then(function (dbUser) {
      if (dbUser.Token == null) {
        done(null, false, { message: 'this user has no access tokens' })
        return null
      } else {
        for (const i in dbUser.Token) {
          if (dbUser.Token.hasOwnProperty(i)) { // eslint-disable-line no-prototype-builtins
            if (dbUser.Token[i].auth_token_expires_at.valueOf() <= new Date()) {
              dbUser.Token[i]
                .destroy()
                .then(function () {
                  console.info('expired user token deleted')
                })
                .catch(function (err) {
                  console.error('failed to delete expired user token | ' + err)
                })
            } else if ((dbUser.Token[i].auth_token_hash === hashedCredentials(dbUser.Token[i].auth_token_salt, token)) &&
              ((dbUser.Token[i].only_allow_access_to == null) ||
                (regex.regExIndexOf(req.baseUrl + req.path, JSON.parse(dbUser.Token[i].only_allow_access_to)) > -1))) {
              req.rfcx.auth_token_info = {
                type: 'user',
                id: dbUser.Token[i].id,
                guid: dbUser.guid,
                owner_id: dbUser.id,
                owner_guid: dbUser.guid,
                userType: 'rfcx'
              }

              if (verboseLogging) {
                console.info('authenticated as user ' + req.rfcx.auth_token_info.guid)
              }
              done(null, req.rfcx.auth_token_info)
              return null
            }
          }
        }
      }
      console.warn('failed to match token with salted hash')
      done(null, false, { message: 'invalid user/token combination' })
      return null
    }).catch(function (err) {
      console.warn('failed to find user | ' + JSON.stringify(err))
      done(err)
      return null
    })
}
