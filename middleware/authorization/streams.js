const { authenticatedWithRoles } = require('./authorization')
const streamPermissionService = require('../../services/streams-timescale/permission')
const httpError = require('../../utils/http-errors')

/**
 * @typedef {string} Permission Supported values "R" (read) or "W" (write)
 */

/**
 * A middleware (or array of middleware) that ensures the user has permission on a stream
 * @param {Permission} permission
 */
function hasPermission (permission) {
  return authenticatedWithRoles('rfcxUser').concat((req, res, next) => {
    const streamId = req.params.streamId || req.params.id
    const userId = req.rfcx.auth_token_info.owner_id
    return streamPermissionService.hasPermission(userId, streamId, permission)
      .then(allowed => {
        if (!allowed) {
          return httpError(req, res, 403, null, 'You do not have permission to access this stream.')
        }
        next()
      })
    })
}

module.exports = {
  hasPermission
}
