const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwksRsa = require('jwks-rsa-passport-edition');
const userService = require('../../services/users/users-service');
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
    type: 'user',
    owner_id: user.id,
    owner_guid: user.guid,
  });
}

function checkDBUser(req, jwtPayload, done) {
  userService.findOrCreateUser(
    {
      $or: {
        guid: jwtPayload.guid,
        email: jwtPayload.email,
      }
    },
    {
      guid: jwtPayload.guid,
      firstname: jwtPayload.firstname,
      lastname: jwtPayload.lastname,
      email: jwtPayload.email,
    }
  )
  .spread((user, created) => {
    if (!created) {
      userService.refreshLastLogin(user);
    }
    let info = combineUserData(jwtPayload, user);
    req.rfcx.auth_token_info = info;
    done(null, req.rfcx.auth_token_info);
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
