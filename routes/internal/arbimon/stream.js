const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const usersFusedService = require('../../../services/users/fused')
const streamsService = require('../../../services/streams')
const projectsService = require('../../../services/projects')
const rolesService = require('../../../services/roles')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')

/**
 * @swagger
 *
 * /internal/arbimon/streams/{externalId}:
 *   patch:
 *     summary: Update a stream by Arbimon id
 *     tags:
 *       - internal
 *     parameters:
 *       - name: externalId
 *         description: Arbimon stream id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Stream object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.patch('/streams/:externalId', (req, res) => {
  const user = req.rfcx.auth_token_info
  const externalId = req.params.externalId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  params.convert('project_external_id').optional().toInt()

  return params.validate()
    .then(() => usersFusedService.ensureUserSyncedFromToken(req))
    .then(() => streamsService.get({ external_id: externalId }))
    .then(async stream => {
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, stream, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      if (convertedParams.project_external_id) {
        const externalProject = await projectsService.get({ external_id: convertedParams.project_external_id })
        const allowed = await rolesService.hasPermission(rolesService.CREATE, req.rfcx.auth_token_info, externalProject.id, rolesService.PROJECT)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to add stream into this project.')
        }
        convertedParams.project_id = externalProject.id
      }
      return streamsService.update(stream, convertedParams, { joinRelations: true })
    })
    .then(streamsService.formatStream)
    .then(json => res.json(json))
    .catch(httpErrorHandler(req, res, 'Failed updating stream'))
})

/**
 * @swagger
 *
 * /internal/arbimon/streams/{externalId}:
 *   delete:
 *     summary: Delete a stream (soft-delete)
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.delete('/streams/:externalId', async (req, res) => {
  try {
    await usersFusedService.ensureUserSyncedFromToken(req)
    const stream = await streamsService.get({ external_id: req.params.externalId })
    const allowed = await rolesService.hasPermission('D', req.rfcx.auth_token_info, stream, rolesService.STREAM)
    if (!allowed) {
      throw new ForbiddenError('You do not have permission to delete this stream.')
    }
    await streamsService.softDelete(stream)
    res.sendStatus(204)
  } catch (e) {
    httpErrorHandler(req, res, 'Failed deleting stream')(e)
  }
})

module.exports = router
