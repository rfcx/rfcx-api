const TokenStrategy = require('passport-accesstoken').Strategy

const authenticateAs = {
  Guardian: require('./auth-as-guardian').authenticateAs,
  User: require('./auth-as-user').authenticateAs,
  RegistrationToken: require('./auth-with-registration-token').authenticateAs,
  AnonymousToken: require('./auth-with-anonymous-token').authenticateAs
}

exports.TokenStrategy =

    new TokenStrategy({
      tokenHeader: 'x-auth-token',
      tokenField: 'auth_token',
      tokenParams: 'auth_token',
      tokenQuery: 'auth_token',
      passReqToCallback: true
    }, function (req, token, done) {
      // parses auth_user from req.rfcx...
      // the way this is being done should probably be consolidated or re-considered
      const authUser = { type: null, guid: null }
      for (const i in req.rfcx.auth_user) {
        if ((req.rfcx.auth_user[i] != null) && (req.rfcx.auth_user[i].indexOf('/') > 0)) {
          authUser.type = req.rfcx.auth_user[i].split('/')[0].toLowerCase()
          authUser.guid = req.rfcx.auth_user[i].split('/')[1].toLowerCase()
          break
        } else if (req.rfcx.auth_user[i] != null) {
          authUser.type = req.rfcx.auth_user[i]
          break
        }
      }

      switch (authUser.type) {
        case 'token':
          return authenticateAs.AnonymousToken(req, token, done, authUser)
        case 'user':
          return authenticateAs.User(req, token, done, authUser)

        case 'guardian':
          return authenticateAs.Guardian(req, token, done, authUser)

        case 'register':
          return authenticateAs.RegistrationToken(req, token, done, authUser)

        default:
          return done(null, false)
      }
    })
