const rolesService = require('../../../core/roles/dao')
const { httpErrorResponse } = require('../../error-handling/http')
const { httpErrorHandler } = require('../../error-handling/http.js')

/**
 * @typedef {string} Permission Supported values "C" (create), "R" (read), "U" (update), "D" (delete)
 */

/**
 * A middleware (or array of middleware) that ensures the user has permission on a subject
 * @param {Permission} permission
 */
function hasPermission (permission, modelName) {
  return (req, res, next) => {
    const subjectId = req.params.id
    return rolesService.hasPermission(permission, req.rfcx.auth_token_info, subjectId, modelName)
      .then(allowed => {
        if (!allowed) {
          return httpErrorResponse(req, res, 403, null, 'You do not have permission to access this item.')
        }
        next()
      })
      .catch(httpErrorHandler(req, res, 'Unable to process request.'))
  }
}

function hasOrganizationPermission (permission) {
  return hasPermission(permission, rolesService.ORGANIZATION)
}

function hasProjectPermission (permission) {
  return hasPermission(permission, rolesService.PROJECT)
}

function hasStreamPermission (permission) {
  return hasPermission(permission, rolesService.STREAM)
}

module.exports = {
  hasPermission,
  hasOrganizationPermission,
  hasProjectPermission,
  hasStreamPermission
}
