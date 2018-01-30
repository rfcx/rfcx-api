const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwksRsa = require('jwks-rsa-passport-edition');

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

let jwtStrategy = new JwtStrategy(opts, (req, jwt_payload, done) => {
  req.rfcx.auth0 = true;
  done(null, {});
});

exports.JwtStrategy = jwtStrategy;
