const { authenticatedWithRoles } = require('./authorization')
const streamsService = require('../../services/streams-timescale')
const ForbiddenError = require('../../utils/converter/forbidden-error')

/**
 * @typedef {string} Permission Supported values "read" or "write"
 */

/** 
 * A middleware (or array of middleware) that ensures the user has permission on a stream
 * @param {Permission} permission 
 */
function hasPermission (permission) {
  return authenticatedWithRoles('rfcxUser').concat((req, res, next) => {
    const streamId = req.params.streamId || req.params.id
    const userId = req.rfcx.auth_token_info.owner_id
    return streamsService.hasPermission(userId, streamId, permission)
      .then(allowed => {
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
        next()
      })
    })
}

module.exports = { hasPermission }