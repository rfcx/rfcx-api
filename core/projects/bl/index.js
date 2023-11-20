const dao = require('../dao')
const { hasPermission, PROJECT, UPDATE } = require('../../roles/dao')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const arbimonService = require('../../_services/arbimon')

/**
 * Update project
 * @param {string} id
 * @param {Project} project
 * @param {string} project.name
 * @param {string} project.description
 * @param {boolean} project.is_public
 * @param {boolean} project.is_partner
 * @param {integer} project.external_id
 * @param {*} options
 * @param {number} options.updatableBy Update only if project is updatable by the given user id
 * @param {string} options.requestSource Whether the request was sent from the Arbimon or not
 * @param {string} options.idToken user jwt token
 * @throws EmptyResultError when project not found
 * @throws ForbiddenError when `updatableBy` user does not have update permission on the project
 */
async function update (id, project, options = {}) {
  if (options.updatableBy && !(await hasPermission(UPDATE, options.updatableBy, id, PROJECT))) {
    throw new ForbiddenError()
  }
  const result = await dao.update(id, project, options)
  if (arbimonService.isEnabled && options.requestSource !== 'arbimon') {
    try {
      return await arbimonService.updateProject({ ...project, id }, options.idToken)
    } catch (err) {
      console.error('Failed updating project in Arbimon', err)
    }
  }
  return result
}

module.exports = {
  update
}
