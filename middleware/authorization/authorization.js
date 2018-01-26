var httpError = require('../../utils/http-errors');
var passport = require("passport");
let checkJwt = require('../../utils/jwt');
passport.use(require("../passport-token").TokenStrategy);

// Factory method to create a token type authorization middleware
function requireTokenType(type) {
  // curry
  return function (req, res, next) {
    if(req.rfcx.auth_token_info.type != type) {
      httpError(res, 403, "token");
      req.end();
    } else {
      next();
    }
  };
}

function ensureAuthenticated(req, res, next) {
  passport.authenticate('token', {session: false}, function(err, user) {
    if (err) {
      return next(err);
    }
    if (user) {
      return next();
    }
    else {
      checkJwt(req, res, next);
    }
  })(req, res, next);
}

module.exports = {
  requireTokenType,
  ensureAuthenticated,
};
