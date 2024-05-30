const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const jwksRsa = require('jwks-rsa-passport-edition')
const userService = require('../../users')
const { randomGuid } = require('../../../common/crypto/random')
const { getUserRolesFromToken } = require('../../auth0')

const jwtExtractor = ExtractJwt.fromAuthHeaderAsBearerToken()

const cert = jwksRsa.passportJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
})

const baseOpts = {
  jwtFromRequest: jwtExtractor,
  secretOrKeyProvider: cert,
  issuer: [`https://${process.env.AUTH0_DOMAIN}/`, `https://${process.env.AUTH0_CUSTOM_DOMAIN}/`],
  algorithms: ['RS256'],
  passReqToCallback: true
}

function combineUserData (jwtPayload, user) {
  return Object.assign({}, jwtPayload, {
    id: user.id,
    guid: user.guid,
    type: 'user',
    owner_id: user.id,
    owner_guid: user.guid,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    is_super: !!user.is_super,
    has_system_role: getUserRolesFromToken(jwtPayload).includes('systemUser')
  })
}

function checkDBUser (req, jwtPayload, done) {
  const rfcxAppMetaUrl = 'https://rfcx.org/app_metadata'
  const tokenUserGuid = jwtPayload.guid || (jwtPayload[rfcxAppMetaUrl] ? jwtPayload[rfcxAppMetaUrl].guid : undefined)
  // if request was sent from userless account (like GAIA), then use static user
  if (!jwtPayload.email && !tokenUserGuid) {
    jwtPayload.isStaticUser = true
    jwtPayload.email = 'userless@rfcx.org'
    jwtPayload.given_name = 'userless'
    jwtPayload.family_name = 'rfcx'
    jwtPayload.guid = randomGuid()
  }

  if (jwtPayload.email === 'anonymous-assistant@rfcx.org') {
    jwtPayload.isStaticUser = true
  }

  // if request was sent from account which doesn't have email (like Facebook, created with a phone number)
  if (!jwtPayload.email && tokenUserGuid) {
    jwtPayload.email = `${tokenUserGuid}@rfcx.org`
  }

  userService.findOrCreateUser({
    guid: jwtPayload.guid || (jwtPayload[rfcxAppMetaUrl] ? jwtPayload[rfcxAppMetaUrl].guid : ''),
    email: jwtPayload.email,
    firstname: jwtPayload.given_name || (jwtPayload.user_metadata ? jwtPayload.user_metadata.given_name : ''),
    lastname: jwtPayload.family_name || (jwtPayload.user_metadata ? jwtPayload.user_metadata.family_name : '')
  }).then(([user, created]) => {
    req.rfcx.auth_token_info = combineUserData(jwtPayload, user)
    done(null, req.rfcx.auth_token_info)
    return true
  }).catch(e => {
    done(e)
  })
}

function jwtCallback (req, jwtPayload, done) {
  jwtPayload.userType = 'auth0'
  checkDBUser(req, jwtPayload, done)
}

const jwtStrategy = new JwtStrategy(baseOpts, jwtCallback)

module.exports = {
  JwtStrategy: jwtStrategy
}
