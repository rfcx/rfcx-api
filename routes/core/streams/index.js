const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const streamsService = require('../../../services/streams')
const projectsService = require('../../../services/projects')
const usersService = require('../../../services/users/fused')
const hash = require('../../../utils/misc/hash.js').hash
const Converter = require('../../../utils/converter/converter')
const { hasStreamPermission } = require('../../../middleware/authorization/roles')
const { Stream } = require('../../../modelsTimescale')
const { hasPermission, PROJECT, UPDATE } = require('../../../services/roles')
const ARBIMON_ENABLED = `${process.env.ARBIMON_ENABLED}` === 'true'
if (ARBIMON_ENABLED) {
  var arbimonService = require('../../../services/arbimon')
}

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
    .then(() => usersService.ensureUserSyncedFromToken(req))
    .then(async () => {
      if (convertedParams.project_id) {
        await projectsService.get(convertedParams.project_id)
        const allowed = await hasPermission(UPDATE, req.rfcx.auth_token_info, convertedParams.project_id, PROJECT)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to create stream in this project.')
        }
      }
      if (convertedParams.project_external_id) {
        const externalProject = await projectsService.get({ external_id: convertedParams.project_external_id })
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
    .then(stream => res.location(`/streams/${stream.id}`).status(201).json(stream))
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
 *       - name: keyword
 *         description: Match streams with name
 *         in: query
 *         type: string
 *       - name: organizations
 *         description: Match streams belonging to one or more organizations (by id)
 *         in: query
 *         type: array
 *       - name: projects
 *         description: Match streams belonging to one or more projects (by id)
 *         in: query
 *         type: array
 *       - name: created_by
 *         description: Match streams based on creator (can be `me` or a user guid)
 *         in: query
 *       - name: updated_after
 *         description: Only return streams that were updated since/after (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: start
 *         description: Match streams starting after (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: end
 *         description: Match streams starting before (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: only_public
 *         description: Include public streams only
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: only_deleted
 *         description: Include deleted streams only
 *         in: query
 *         type: boolean
 *         default: false
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
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
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
  const readableBy = user.is_super || user.has_system_role ? undefined : user.owner_id
  const converter = new Converter(req.query, {}, true)
  converter.convert('keyword').optional().toString()
  converter.convert('organizations').optional().toArray()
  converter.convert('projects').optional().toArray()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('created_by').optional().toString()
  converter.convert('updated_after').optional().toMomentUtc()
  converter.convert('only_public').optional().toBoolean()
  converter.convert('only_deleted').optional().toBoolean()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async params => {
      const { keyword, organizations, projects, start, end, onlyPublic, onlyDeleted, limit, offset, fields } = params
      let createdBy = params.createdBy
      if (createdBy === 'me') {
        createdBy = readableBy
      } else if (createdBy) {
        createdBy = (await usersService.getIdByGuid(createdBy)) || -1 // user doesn't exist
      }
      const filters = { keyword, organizations, projects, start, end, createdBy }
      const options = {
        readableBy,
        onlyPublic,
        onlyDeleted,
        limit,
        offset,
        // TODO remove this hack after fixing apps are using non-lite attributes
        fields: fields !== undefined
          ? fields
          : [...Stream.attributes.full, 'created_by', 'project', 'permissions']
      }
      const streamsData = await streamsService.query(filters, options)
      return res.header('Total-Items', streamsData.total).json(streamsData.results)
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
  const id = req.params.id
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: user.is_super || user.has_system_role ? undefined : user.owner_id,
        fields: params.fields
      }
      return streamsService.get(id, options)
    })
    .then(stream => res.json(stream))
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
  const converter = new Converter(req.body, {})
  converter.convert('name').optional().toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  converter.convert('altitude').optional().toFloat()
  converter.convert('restore').optional().toBoolean()

  converter.validate().then(async (params) => {
    await usersService.ensureUserSyncedFromToken(req)
    const stream = await streamsService.get(streamId)
    if (params.restore === true) {
      await streamsService.restore(stream)
    }
    // TODO - add updatableBy checks
    const updatedStream = await streamsService.update(stream, params, { joinRelations: true })
    if (ARBIMON_ENABLED) {
      const idToken = req.headers.authorization
      arbimonService.updateSite(updatedStream.toJSON(), idToken) // do not use await to avoid errors for missing sites
    }
    res.json(streamsService.formatStream(updatedStream))
  }).catch((e) => {
    httpErrorHandler(req, res, 'Failed updating stream')(e)
  })
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
  // TODO - add deletableBy checks
  return streamsService.get(req.params.id)
    .then(streamsService.softDelete)
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
})

module.exports = router
