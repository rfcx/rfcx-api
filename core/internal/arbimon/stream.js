const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamDao = require('../../streams/dao')
const projectsService = require('../../projects/dao')
const rolesService = require('../../roles/dao')
const Converter = require('../../../common/converter')
const { ForbiddenError } = require('../../../common/error-handling/errors')
const guardiansService = require('../../../noncore/_services/guardians/guardians-service')
const { getTzByLatLng } = require('../../_utils/datetime/timezone')

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
  params.convert('altitude').optional().toFloat()
  params.convert('project_external_id').optional().toInt()

  return params.validate()
    .then(() => streamDao.get({ external_id: externalId }))
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

      if (convertedParams.latitude === 0) {
        convertedParams.latitude = null
      }

      if (convertedParams.longitude === 0) {
        convertedParams.longitude = null
      }

      await streamDao.update(stream.id, convertedParams)
      // Update project_id, timezone in MySQL Guardians
      if (convertedParams.project_id || (convertedParams.latitude !== undefined && convertedParams.longitude)) {
        try {
          const dbGuardian = await guardiansService.getGuardianByStreamId(stream.id, true)
          const options = {
            ...convertedParams.project_id !== undefined && { project_id: convertedParams.project_id },
            ...convertedParams.latitude !== undefined && convertedParams.longitude !== undefined && { timezone: await getTzByLatLng(convertedParams.latitude, convertedParams.longitude) }
          }
          await guardiansService.updateGuardian(dbGuardian, options)
        } catch (error) {
          console.error(`Error updating guardian project (stream: ${stream.id})`)
        }
      }
      return await streamDao.get(stream.id)
    })
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
router.delete('/streams/:externalId', (req, res) => {
  streamDao.get({ external_id: req.params.externalId })
    .then(async (stream) => {
      const allowed = await rolesService.hasPermission('D', req.rfcx.auth_token_info, stream, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to delete this stream.')
      }
      await streamDao.remove(stream.id)
      return res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
})

module.exports = router
