const { httpErrorResponse } = require('../../error-handling/http')
const auth0Service = require('../../auth0')
const passport = require('passport')
passport.use(require('../passport-token').TokenStrategy)
passport.use('jwt', require('../passport-jwt').JwtStrategy)
passport.use('stream-token', require('../passport-stream-token'))

// Factory method to create a token type authorization middleware
function requireTokenType (type) {
  // curry
  return function (req, res, next) {
    if (req.rfcx.auth_token_info.type !== type) {
      httpErrorResponse(req, res, 403, 'token')
      req.end()
    } else {
      next()
    }
  }
}

/**
 * Creates a middleware for checking if user has one or more of the roles
 * How to use:
 * var hasRole = require('..../common/middleware/authorization/authorization').hasRole;
 * router.route("/").get(passport.authenticate(['token', 'jwt'], { session:false }), hasRole(['rfcxUser']), function(req, res) { ... })
 * @param {Array<String>} expectedRoles
 */
function hasRole (expectedRoles) {
  expectedRoles = (Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles])
  return function (req, res, next) {
    if (expectedRoles.length === 0 || req.user.userType !== 'auth0') { return next() }
    if (!req.user) { return res.sendStatus(403) }
    const roles = auth0Service.getUserRolesFromToken(req.user)
    const allowed = expectedRoles.some((role) => {
      return roles.indexOf(role) !== -1
    })
    return allowed ? next() : res.sendStatus(403)
  }
}

/**
 * Creates an array of middleware that checks the user is authenticated
 * (with JWT) and has one or more of the roles
 *
 * @param  {...String} roles
 */
function authenticatedWithRoles (...roles) {
  return [passport.authenticate(['jwt'], { session: false }), hasRole(roles)]
}

/**
 * Creates a middleware that checks the user is authenticated (with JWT or stream-token)
 */
function authenticate (strategies = ['jwt', 'stream-token']) {
  return passport.authenticate(strategies, { session: false })
}

/**
 * All DB users have attribute rfcx_system. Dev team and old RFCx users have rfcx_system === true
 * All other users which were authorized through auth0 or other services have rfcx_system === false
 * This middleware checks if user has rfcx_system set to true and denies access if it's false
 */
function isRFCxUser () {
  return function (req, res, next) {
    // if (expectedRoles.length === 0 || req.user.userType !== 'auth0'){ return next(); }
    if (!req.user || req.user.rfcx_system === false) { return res.sendStatus(403) }
    return next()
  }
}

module.exports = {
  requireTokenType,
  hasRole,
  authenticate,
  authenticatedWithRoles,
  isRFCxUser
}
