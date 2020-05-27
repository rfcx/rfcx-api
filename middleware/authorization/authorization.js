var httpError = require('../../utils/http-errors');
var auth0Service = require('../../services/auth0/auth0-service');
var passport = require("passport");
passport.use(require("../passport-token").TokenStrategy);
passport.use('jwt', require('../passport-jwt').JwtStrategy);
passport.use('jwt-custom', require('../passport-jwt').JwtStrategyCustom);

// Factory method to create a token type authorization middleware
function requireTokenType(type) {
  // curry
  return function (req, res, next) {
    if (req.rfcx.auth_token_info.type != type) {
      httpError(req, res, 403, "token");
      req.end();
    } else {
      next();
    }
  };
}

/**
 * Checks if user has required role to access the endpoint
 * How to use:
 * var hasRole = require('..../middleware/authorization/authorization').hasRole;
 * router.route("/").get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session:false }), hasRole(['rfcxUser']), function(req, res) { ... })
 * @param {Array<String>} expectedRoles
 */
function hasRole(expectedRoles) {
  expectedRoles = (Array.isArray(expectedRoles)? expectedRoles : [expectedRoles]);
  return function(req, res, next) {
    if (expectedRoles.length === 0 || req.user.userType !== 'auth0'){ return next(); }
    if (!req.user) { return res.sendStatus(403); }
    let roles = auth0Service.getUserRolesFromToken(req.user);
    var allowed = expectedRoles.some((role) => {
      return roles.indexOf(role) !== -1;
    });
    return allowed ? next() : res.sendStatus(403);
  }
};

/**
 * Ensure user is authenticated (with JWT) and has the roles
 * 
 * @param  {...String} roles 
 */
function authenticatedWithRoles (...roles) {
  return [passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(roles)]
}

/**
 * All DB users have attribute rfcx_system. Dev team and old RFCx users have rfcx_system === true
 * All other users which were authorized through auth0 or other services have rfcx_system === false
 * This middleware checks if user has rfcx_system set to true and denies access if it's false
 */
function isRFCxUser() {
  return function(req, res, next) {
    // if (expectedRoles.length === 0 || req.user.userType !== 'auth0'){ return next(); }
    if (!req.user || req.user.rfcx_system === false) { return res.sendStatus(403); }
    return next();
  }
}

module.exports = {
  requireTokenType,
  hasRole,
  authenticatedWithRoles,
  isRFCxUser,
};
