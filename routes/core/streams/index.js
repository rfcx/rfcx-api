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
const arbimonService = require('../../../services/arbimon')

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
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/streams/xyz123`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/', async (req, res) => {
  let stream
  try {
    const userId = req.rfcx.auth_token_info.owner_id
    const converter = new Converter(req.body, {})
    const source = req.headers.source
    converter.convert('id').optional().toString().toLowerCase()
    converter.convert('name').toString()
    converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
    converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
    converter.convert('altitude').optional().toFloat()
    converter.convert('description').optional().toString()
    converter.convert('is_public').optional().toBoolean().default(false)
    converter.convert('external_id').optional().toInt()
    converter.convert('project_id').optional().toString()
    converter.convert('project_external_id').optional().toInt()

    const params = await converter.validate()
    params.id = params.id || hash.randomString(12).toLowerCase()
    params.created_by_id = userId
    await usersFusedService.ensureUserSyncedFromToken(req)
    let project
    if (params.project_id) {
      project = await projectsService.getById(params.project_id)
    }
    if (params.project_external_id) {
      project = await projectsService.getByExternalId(params.project_external_id)
      // TODO: request project from Arbimon if not found
      params.project_id = project.id
    }
    if (project) {
      const allowed = await hasPermission(UPDATE, req.rfcx.auth_token_info, project.id, PROJECT)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to create stream in this project.')
      }
    }

    stream = await streamsService.create(params, { joinRelations: true })
    if (arbimonService.isEnabled && source !== 'arbimon') {
      const idToken = req.headers.authorization
      const arbimonSite = await arbimonService.createSite(stream.toJSON(), idToken)
      stream = await streamsService.update(stream, { external_id: arbimonSite.site_id }, { joinRelations: true })
    }
    res.location(`/streams/${stream.id}`).status(201).json(streamsService.formatStream(stream))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed creating stream')(e)
    if (stream) {
      streamsService.del(stream, { force: true })
    }
  }
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
 *       - name: updated_after
 *         description: Only return streams that were updated since/after (iso8601 or epoch)
 *         in: query
 *         type: string
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
 *       - name: sort
 *         description: Name of field to sorted / "-" for DESC default for ASC
 *         in: query
 *         type: string
 *         example: is_public,-updated_at
 *
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
  params.convert('updated_after').optional().toMomentUtc()
  params.convert('start').optional().toMomentUtc()
  params.convert('end').optional().toMomentUtc()
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)
  params.convert('sort').optional().toString()

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
router.patch('/:id', hasStreamPermission('U'), async (req, res) => {
  try {
    const streamId = req.params.id
    const source = req.headers.source
    const converter = new Converter(req.body, {})
    converter.convert('name').optional().toString()
    converter.convert('description').optional().toString()
    converter.convert('is_public').optional().toBoolean()
    converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
    converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
    converter.convert('altitude').optional().toFloat()
    converter.convert('restore').optional().toBoolean()

    const params = await converter.validate()
    await usersFusedService.ensureUserSyncedFromToken(req)
    const stream = await streamsService.getById(streamId, { includeDeleted: params.restore === true })
    if (params.restore === true) {
      await streamsService.restore(stream)
    }
    const updatedStream = await streamsService.update(stream, params, { joinRelations: true })
    if (arbimonService.isEnabled && source !== 'arbimon') {
      try {
        const idToken = req.headers.authorization
        await arbimonService.updateSite(updatedStream.toJSON(), idToken)
      } catch (err) {
        console.error('Failed updating stream in Arbimon', err)
      }
    }
    res.json(streamsService.formatStream(updatedStream))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed updating stream')(e)
  }
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
router.delete('/:id', hasStreamPermission('D'), async (req, res) => {
  try {
    const source = req.headers.source
    const stream = await streamsService.getById(req.params.id, { joinRelations: true })
    const streamId = stream.id
    await streamsService.del(stream)
    if (arbimonService.isEnabled && source !== 'arbimon') {
      try {
        const idToken = req.headers.authorization
        await arbimonService.deleteSite(streamId, idToken)
      } catch (err) {
        console.error('Failed deleting site in Arbimon', err)
      }
    }
    res.sendStatus(204)
  } catch (e) {
    httpErrorHandler(req, res, 'Failed deleting stream')(e)
  }
})

module.exports = router
