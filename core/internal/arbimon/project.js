const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http.js')
const projectsService = require('../../_services/projects')
const rolesService = require('../../_services/roles')
const Converter = require('../../../utils/converter/converter')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const ensureUserSynced = require('../../../common/middleware/legacy/ensure-user-synced')

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
router.patch('/projects/:externalId', ensureUserSynced, (req, res) => {
  const user = req.rfcx.auth_token_info
  const projectId = req.params.externalId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean()

  return params.validate()
    .then(() => projectsService.get({ external_id: projectId }))
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
