const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const path = require('path');
const fs = require('fs');

const cert = fs.readFileSync(path.join(__dirname, process.env.AUTH0_CERT_PATH));

var opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: cert,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
  algorithms: ['RS256'],
  passReqToCallback: false
};

let jwtStrategy = new JwtStrategy(opts, (jwt_payload, done) => {
  return done(null, {});
});

exports.JwtStrategy = jwtStrategy;
