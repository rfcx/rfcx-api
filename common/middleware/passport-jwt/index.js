const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const jwksRsa = require('jwks-rsa-passport-edition')
const userService = require('../../users')
const { randomGuid, stableGuidFromString } = require('../../../common/crypto/random')
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
  // Identity-less token handling.
  //
  // Historically ANY token without an `email` claim AND without an
  // app_metadata.guid was collapsed onto the shared static user
  // `userless@rfcx.org`. That is too aggressive: it also swallows
  //   (a) real human accounts whose access token simply lacks the custom
  //       `https://rfcx.org/...` claims (e.g. minimally-scoped SDK tokens), and
  //   (b) machine-to-machine client-credentials tokens,
  // making them indistinguishable from a truly anonymous caller in logs and in
  // `created_by` attribution. We now derive a stable principal from the token
  // `sub`/`azp` first, and only fall back to `userless` when there is genuinely
  // no identifying claim at all. This is attribution-only: authorization (roles
  // + DB membership) is unchanged, so it cannot grant or remove access.
  if (!jwtPayload.email && !tokenUserGuid) {
    const sub = typeof jwtPayload.sub === 'string' ? jwtPayload.sub : ''
    const isClientCredentials = jwtPayload.gty === 'client-credentials' || /@clients$/.test(sub)
    if (isClientCredentials) {
      // Machine client. Stable per-client identity so M2M traffic is
      // attributable per application instead of pooling into `userless`.
      const clientId = sub.replace(/@clients$/, '') || jwtPayload.azp || 'unknown'
      jwtPayload.isStaticUser = true
      jwtPayload.isMachineClient = true
      jwtPayload.email = `${clientId}@clients.rfcx.org`
      jwtPayload.given_name = 'client'
      jwtPayload.family_name = clientId
      jwtPayload.guid = stableGuidFromString(`client:${clientId}`)
    } else if (sub) {
      // Real (human) account whose token omitted the custom email/guid claims.
      // Attribute to the auth0 subject (stable guid from `sub`). We do not invent
      // a trustworthy email; findOrCreateUser matches on guid. An out-of-band
      // Auth0 Management backfill can enrich email+name later.
      jwtPayload.isStaticUser = false
      jwtPayload.guid = stableGuidFromString(`sub:${sub}`)
      jwtPayload.email = jwtPayload.email || `${sub.replace(/[^a-zA-Z0-9]/g, '_')}@subject.rfcx.org`
      jwtPayload.given_name = jwtPayload.given_name || 'auth0'
      jwtPayload.family_name = jwtPayload.family_name || sub
    } else {
      // Genuinely no identity (legacy GAIA-style). Preserve original behaviour.
      jwtPayload.isStaticUser = true
      jwtPayload.email = 'userless@rfcx.org'
      jwtPayload.given_name = 'userless'
      jwtPayload.family_name = 'rfcx'
      jwtPayload.guid = randomGuid()
    }
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
