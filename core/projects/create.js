const { httpErrorHandler } = require('../../common/error-handling/http')
const { ForbiddenError } = require('../../common/error-handling/errors')
const dao = require('./dao')
const { randomId } = require('../../common/crypto/random')
const Converter = require('../../common/converter')
const { hasPermission, CREATE, ORGANIZATION } = require('../roles/dao')
const arbimonService = require('../_services/arbimon')

/**
 * @swagger
 *
 * /projects:
 *   post:
 *     summary: Create a project
 *     tags:
 *       - projects
 *     requestBody:
 *       description: Project object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/projects/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */

module.exports = (req, res) => {
  const createdById = req.rfcx.auth_token_info.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('id').optional().toString()
  converter.convert('name').toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').default(false).toBoolean()
  converter.convert('organization_id').optional().toString()
  converter.convert('external_id').optional().toInt()

  return converter.validate()
    .then(async (params) => {
      // TODO move - route handler should not contain business logic
      if (params.organizationId) {
        const allowed = await hasPermission(CREATE, createdById, params.organizationId, ORGANIZATION)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to create project in this organization.')
        }
      }

      const project = {
        ...params,
        createdById,
        id: randomId()
      }

      // TODO move - route handler should not contain business logic
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const arbimonProject = await arbimonService.createProject(project, req.headers.authorization)
          project.externalId = arbimonProject.project_id
        } catch (error) {
          console.error(`Error creating project in Arbimon (project: ${project.id})`)
          throw new Error()
        }
      }

      return await dao.create(project)
    })
    .then(project => res.location(`/projects/${project.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating project'))
}
