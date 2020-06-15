const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const usersTimescaleDBService = require('../../../services/users/users-service-timescaledb');
const hash = require("../../../utils/misc/hash.js").hash;
const Converter = require("../../../utils/converter/converter")

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
  params.convert('id').optional().toString();
  params.convert('name').toString();
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90);
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180);
  params.convert('description').optional().toString();
  params.convert('is_private').optional().toString();

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSynced(req))
    .then(() => {
      convertedParams.id = convertedParams.id || hash.randomString(12);
      convertedParams.created_by_id = req.rfcx.auth_token_info.owner_id;
      return streamsService.create(convertedParams, true);
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
 *       - name: is_private
 *         description: Return only your private streams or all shared with you streams
 *         in: query
 *         type: string
 *       - name: is_deleted
 *         description: Return only your deleted streams (forces `is_private` to be true)
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
 *     responses:
 *       200:
 *         description: List of streams objects
 *         headers:
 *           x-rfcx-total:
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
router.get("/", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_private').optional().toBoolean()
  params.convert('is_deleted').optional().toBoolean()
  params.convert('start').optional().toMomentUtc()
  params.convert('end').optional().toMomentUtc()
  params.convert('keyword').optional().toString()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)

  return params.validate()
    .then(() => {
      if (convertedParams.is_deleted) { // return only user's private streams when user requests deleted streams
        convertedParams.is_private = true;
      }
      return streamsService.query(convertedParams, { joinRelations: true });
    })
    .then((data) => {
      res
        .header('x-rfcx-total', data.count)
        .status(200)
        .json(streamsService.formatStreams(data.streams))
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
router.get("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(stream => {
      streamsService.checkUserAccessToStream(req, stream);
      return streamsService.formatStream(stream);
    })
    .then(json => res.status(200).json(json))
    .catch(httpErrorHandler(req, res, 'Failed getting stream'));
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
router.patch("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('name').optional().toString()
  params.convert('description').optional().toString()
  params.convert('is_private').optional().toBoolean()
  params.convert('latitude').optional().toFloat().minimum(-90).maximum(90);
  params.convert('longitude').optional().toFloat().minimum(-180).maximum(180);
  params.convert('restore').optional().toBoolean();

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSynced(req))
    .then(() => streamsService.getById(streamId, { includeDeleted: convertedParams.restore === true }))
    .then(async stream => {
      streamsService.checkUserAccessToStream(req, stream);
      if (convertedParams.restore === true) {
        await streamsService.restore(stream);
      }
      return streamsService.update(stream, convertedParams, true);
    })
    .then(streamsService.formatStream)
    .then(json => res.status(200).json(json))
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
router.delete("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  return streamsService.getById(req.params.id, { joinRelations: true })
    .then(stream => {
      streamsService.checkUserAccessToStream(req, stream);
      return streamsService.softDelete(stream);
    })
    .then(json => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'));
})

module.exports = router
