const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwksRsa = require('jwks-rsa-passport-edition');
const userService = require('../../services/users/users-service');
const guid = require('../../utils/misc/guid');
const sequelize = require("sequelize");

const jwtExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();

const cert = jwksRsa.passportJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

var opts = {
  jwtFromRequest: jwtExtractor,
  secretOrKeyProvider: cert,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  passReqToCallback: true
};

function combineUserData(jwtPayload, user) {
  return Object.assign({}, jwtPayload, {
    guid: user.guid,
    type: 'user',
    owner_id: user.id,
    owner_guid: user.guid,
  });
}

function checkDBUser(req, jwtPayload, done) {
  let rfcxAppMetaUrl = 'https://rfcx.org/app_metadata';

  // if request was sent from userless account (like GAIA), then use static user
  if (!jwtPayload.email && !jwtPayload.guid) {
    jwtPayload.email = 'userless@rfcx.org';
    jwtPayload.given_name = 'userless';
    jwtPayload.family_name = 'rfcx';
    jwtPayload.guid = guid.generate();
  }

  userService.findOrCreateUser(
    {
      $or: {
        guid: jwtPayload.guid || (jwtPayload[rfcxAppMetaUrl]? jwtPayload[rfcxAppMetaUrl].guid : ''),
        email: jwtPayload.email,
      }
    },
    {
      guid: jwtPayload.guid || (jwtPayload[rfcxAppMetaUrl]? jwtPayload[rfcxAppMetaUrl].guid : ''),
      email: jwtPayload.email,
      firstname: jwtPayload.given_name || (jwtPayload.user_metadata? jwtPayload.user_metadata.given_name : ''),
      lastname: jwtPayload.family_name || (jwtPayload.user_metadata? jwtPayload.user_metadata.family_name : ''),
      rfcx_system: false,
    }
  )
  .spread((user, created) => {
    if (!created) {
      userService.refreshLastLogin(user);
    }
    let info = combineUserData(jwtPayload, user);
    req.rfcx.auth_token_info = info;
    done(null, req.rfcx.auth_token_info);
    return true;
  })
  .catch(e => {
    done(e);
  });
}

let jwtStrategy = new JwtStrategy(opts, (req, jwtPayload, done) => {
  jwtPayload.userType = 'auth0';
  checkDBUser(req, jwtPayload, done);
});

exports.JwtStrategy = jwtStrategy;
