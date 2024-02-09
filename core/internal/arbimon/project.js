const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const projectsService = require('../../projects/dao')
const rolesService = require('../../roles/dao')
const Converter = require('../../../common/converter')
const { ForbiddenError } = require('../../../common/error-handling/errors')

/**
 * @swagger
 *
 * /internal/arbimon/projects/{externalId}:
 *   patch:
 *     summary: Update a project by Arbimon id
 *     tags:
 *       - internal
 *     parameters:
 *       - name: externalId
 *         description: Arbimon project id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Project object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.patch('/projects/:externalId', (req, res) => {
  const user = req.rfcx.auth_token_info
  const projectId = req.params.externalId
  let convertedParams = {}
  const params = new Converter(req.body, convertedParams, true)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean()

  return params.validate()
    .then((camelizedParams) => {
      convertedParams = { ...camelizedParams } // camelized params only accessible after validated
      return projectsService.get({ external_id: projectId })
    })
    .then(async project => {
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, project, rolesService.PROJECT)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this project.')
      }
      return projectsService.update(project.id, convertedParams, { joinRelations: true })
    })
    .then(projectsService.formatProject)
    .then(json => res.json(json))
    .catch(httpErrorHandler(req, res, 'Failed updating project'))
})

module.exports = router
