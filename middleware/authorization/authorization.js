var httpError = require('../../utils/http-errors');
var passport = require("passport");
passport.use(require("../passport-token").TokenStrategy);
passport.use(require('../passport-jwt').JwtStrategy);

// Factory method to create a token type authorization middleware
function requireTokenType(type) {
  // curry
  return function (req, res, next) {
    if(req.rfcx.auth_token_info.type != type) {
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
 * router.route("/").get(passport.authenticate(['token', 'jwt'], { session:false }), hasRole(['rfcxUser']), function(req, res) { ... })
 * @param {Array<String>} expectedRoles
 */
function hasRole(expectedRoles) {
  expectedRoles = (Array.isArray(expectedRoles)? expectedRoles : [expectedRoles]);
  return function(req, res, next) {
    if (expectedRoles.length === 0 || req.user.userType !== 'auth0'){ return next(); }
    if (!req.user) { return res.sendStatus(403); }
    let roles = obtainRoles(req.user);
    var allowed = expectedRoles.some((role) => {
      return roles.indexOf(role) !== -1;
    });
    return allowed ? next() : res.sendStatus(403);
  }
};

/**
 * All DB users have attribute rfcx_system. Dev team and old RFCx users have rfcx_system === true
 * All other users which were authorized through auth0 or other services have rfcx_system === false
 * This middleware checks if user has rfcx_system set to true and denies access if it's false
 */
function isRFCxUser() {
  return function(req, res, next) {
    // if (expectedRoles.length === 0 || req.user.userType !== 'auth0'){ return next(); }
    if (!req.user || req.user.rfcx_system === false) { return res.sendStatus(403); }
    return  next();
  }
}

function obtainRoles(user) {
  if (user.roles) { return user.roles; }
  if (user.scope) {
    if (typeof user.scope === 'string') {
      try {
        let parsedScrope = JSON.parse(user.scope);
        if (parsedScrope.roles) { return parsedScrope.roles; }
      }
      catch (e) { }
    }
    else {
      if (user.scope.roles) { return user.scope.roles; }
    }
  }
  return [];
}

module.exports = {
  requireTokenType,
  hasRole,
  isRFCxUser,
};
