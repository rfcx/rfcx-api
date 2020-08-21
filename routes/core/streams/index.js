const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams')
const streamPermissionService = require('../../../services/streams/permission')
const usersTimescaleDBService = require('../../../services/users/users-service-timescaledb')
const hash = require('../../../utils/misc/hash.js').hash
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /streams:
 *   post:
 *     summary: Create a stream
 *     tags:
 *       - streams
 *     requestBody:
 *       description: Stream object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Stream'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Stream'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/', authenticatedWithRoles('rfcxUser'), function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('id').optional().toString()
  params.convert('name').toString()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean().default(false)

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSyncedFromToken(req))
    .then(() => {
      convertedParams.id = convertedParams.id || hash.randomString(12)
      convertedParams.created_by_id = req.rfcx.auth_token_info.owner_id
      return streamsService.create(convertedParams, { joinRelations: true })
    })
    .then(streamsService.formatStream)
    .then(stream => res.status(201).json(stream))
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
})

/**
 * @swagger
 *
 * /streams:
 *   get:
 *     summary: Get list of streams
 *     tags:
 *       - streams
 *     parameters:
 *       - name: is_public
 *         description: Return public or private streams
 *         in: query
 *         type: boolean
 *       - name: is_deleted
 *         description: Return only your deleted streams
 *         in: query
 *         type: string
 *       - name: created_by
 *         description: Returns different set of streams based on who has created it
 *         in: query
 *         schema:
 *           type: string
 *           enum:
 *             - me
 *             - collaborators
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: keyword
 *         description: Match streams with name
 *         in: query
 *         type: string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *     responses:
 *       200:
 *         description: List of streams objects
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StreamWithPermissions'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('rfcxUser'), (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('is_deleted').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('start').optional().toMomentUtc()
  params.convert('end').optional().toMomentUtc()
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)

  return params.validate()
    .then(async () => {
      convertedParams.current_user_id = req.rfcx.auth_token_info.owner_id
      const streamsData = await streamsService.query(convertedParams, { joinRelations: true })
      const streams = await Promise.all(streamsData.streams.map(async (stream) => {
        const permissions = await streamPermissionService.getPermissionsForStream(convertedParams.current_user_id, stream)
        return streamsService.formatStream(stream, permissions)
      }))
      return res
        .header('Total-Items', streamsData.count)
        .json(streams)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting streams'))
})

/**
 * @swagger
 *
 * /streams/{id}:
 *   get:
 *     summary: Get a stream
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamWithPermissions'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.get('/:id', authenticatedWithRoles('rfcxUser'), (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(async stream => {
      const userId = req.rfcx.auth_token_info.owner_id
      const allowed = await streamPermissionService.hasPermission(userId, stream, 'R')
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      const permissions = await streamPermissionService.getPermissionsForStream(userId, stream)
      return streamsService.formatStream(stream, permissions)
    })
    .then(json => res.json(json))
    .catch(httpErrorHandler(req, res, 'Failed getting stream'))
})

/**
 * @swagger
 *
 * /streams/{id}:
 *   patch:
 *     summary: Update a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
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
router.patch('/:id', authenticatedWithRoles('rfcxUser'), (req, res) => {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  params.convert('restore').optional().toBoolean()

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSyncedFromToken(req))
    .then(() => streamsService.getById(streamId, { includeDeleted: convertedParams.restore === true }))
    .then(async stream => {
      const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, stream, 'W')
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to write to this stream.')
      }
      if (convertedParams.restore === true) {
        await streamsService.restore(stream)
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
 * /streams/{id}:
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
router.delete('/:id', authenticatedWithRoles('rfcxUser'), (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(async stream => {
      if (stream.created_by_id !== req.rfcx.auth_token_info.owner_id) {
        throw new ForbiddenError('You do not have permission to delete this stream.')
      }
      return streamsService.softDelete(stream)
    })
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
})

module.exports = router
