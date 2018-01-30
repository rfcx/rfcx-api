var httpError = require('../../utils/http-errors');
var passport = require("passport");
passport.use(require("../passport-token").TokenStrategy);
passport.use(require('../passport-jwt').JwtStrategy);

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

/**
 * Checks if user has required roles to access the endpoint
 * How to use:
 * var requireRoles = require('..../middleware/authorization/authorization').requireRoles;
 * router.route("/").get(passport.authenticate(['token', 'jwt'], { session:false }), requireRoles(['rfcxUser']), function(req, res) { ... })
 * @param {Array<String>} expectedRoles
 */
function requireRoles(expectedRoles) {
  expectedRoles = (Array.isArray(expectedRoles)? expectedRoles : [expectedRoles]);
  return function(req, res, next) {
    if (expectedRoles.length === 0){ return next(); }
    if (!req.user) { return res.sendStatus(403); }
    var roles = req.user.roles;
    var allowed = expectedRoles.some((role) => {
      return roles.indexOf(role) !== -1;
    });
    return allowed ? next() : res.sendStatus(403);;
  }
};

module.exports = {
  requireTokenType,
  requireRoles,
};
