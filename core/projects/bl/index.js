const dao = require('../dao')
const { hasPermission, addRole, ORGANIZATION, PROJECT, UPDATE, CREATE, OWNER } = require('../../roles/dao')
const { sequelize } = require('../../_models')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const arbimonService = require('../../_services/arbimon')
const { randomId } = require('../../../common/crypto/random')

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

/**
 * Create project
 * @param {Project} project
 * @param {string} project.id
 * @param {string} project.name
 * @param {string} project.description
 * @param {boolean} project.is_public
 * @param {boolean} project.organization_id
 * @param {integer} project.external_id
 * @param {*} options
 * @param {number} options.creatableById Create only if project is creatable by the given user id
 * @param {string} options.requestSource Whether the request was sent from the Arbimon or not
 * @param {string} options.idToken user jwt token
 * @throws ForbiddenError when `creatableBy` user does not have create permission on the project
 */
async function create (params, options = {}) {
  if (params.organizationId && options.creatableById) {
    const allowed = await hasPermission(CREATE, options.creatableById, params.organizationId, ORGANIZATION)
    if (!allowed) {
      throw new ForbiddenError('You do not have permission to create project in this organization.')
    }
  }

  const project = {
    ...params,
    createdById: options.creatableById,
    id: randomId()
  }

  return sequelize.transaction(async (transaction) => {
    options.transaction = transaction

    if (arbimonService.isEnabled && options.requestSource !== 'arbimon') {
      try {
        const arbimonProject = await arbimonService.createProject(project, options.idToken)
        project.externalId = arbimonProject.project_id
      } catch (error) {
        console.error(`Error creating project in Arbimon (project: ${project.id})`)
      }
    }

    const result = await dao.create(project, options)
    await addRole(result.createdById, OWNER, result.id, PROJECT, options)
    return result
  })
}

module.exports = {
  update,
  create
}
