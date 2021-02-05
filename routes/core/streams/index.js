const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const streamsService = require('../../../services/streams')
const projectsService = require('../../../services/projects')
const usersFusedService = require('../../../services/users/fused')
const hash = require('../../../utils/misc/hash.js').hash
const Converter = require('../../../utils/converter/converter')
const { hasStreamPermission } = require('../../../middleware/authorization/roles')
const { getPermissions, hasPermission, STREAM, PROJECT, READ, UPDATE } = require('../../../services/roles')

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

router.post('/', function (req, res) {
  const userId = req.rfcx.auth_token_info.owner_id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('id').optional().toString()
  params.convert('name').toString()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  params.convert('altitude').optional().toFloat()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean().default(false)
  params.convert('external_id').optional().toInt()
  params.convert('project_id').optional().toString()
  params.convert('project_external_id').optional().toInt()

  return params.validate()
    .then(() => usersFusedService.ensureUserSyncedFromToken(req))
    .then(async () => {
      if (convertedParams.project_id) {
        await projectsService.getById(convertedParams.project_id)
        const allowed = await hasPermission(UPDATE, req.rfcx.auth_token_info, convertedParams.project_id, PROJECT)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to create stream in this project.')
        }
      }
      if (convertedParams.project_external_id) {
        const externalProject = await projectsService.getByExternalId(convertedParams.project_external_id)
        const allowed = await hasPermission(UPDATE, req.rfcx.auth_token_info, externalProject.id, PROJECT)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to create stream in this project.')
        }
        convertedParams.project_id = externalProject.id
      }
      convertedParams.id = convertedParams.id || hash.randomString(12)
      convertedParams.created_by_id = userId
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
 *       - name: organizations
 *         description: List of organization ids
 *         in: query
 *         type: array
 *       - name: projects
 *         description: List of project ids
 *         in: query
 *         type: array
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
 *                 $ref: '#/components/schemas/Stream'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('organizations').optional().toArray()
  params.convert('projects').optional().toArray()
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
      convertedParams.current_user_id = user.owner_id
      convertedParams.current_user_is_super = user.is_super

      const streamsData = await streamsService.query(convertedParams, { joinRelations: true })
      const streams = streamsData.streams.map(x => streamsService.formatStream(x, null))

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
 *               $ref: '#/components/schemas/Stream'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.get('/:id', (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(async stream => {
      const permissions = await getPermissions(req.rfcx.auth_token_info, stream, STREAM)
      if (!permissions.includes(READ)) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
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
router.patch('/:id', hasStreamPermission('U'), (req, res) => {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_public').optional().toBoolean()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  params.convert('altitude').optional().toFloat()
  params.convert('restore').optional().toBoolean()

  return params.validate()
    .then(() => usersFusedService.ensureUserSyncedFromToken(req))
    .then(() => streamsService.getById(streamId, { includeDeleted: convertedParams.restore === true }))
    .then(async stream => {
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
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.delete('/:id', hasStreamPermission('D'), (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(streamsService.softDelete)
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
})

module.exports = router
