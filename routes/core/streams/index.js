const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const locationService = require('../../../services/location/location-service');
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
  params.convert('description').optional().toString();
  params.convert('is_private').optional().toString();
  params.convert('location').optional().toString();

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSynced(req))
    .then(() => {
      convertedParams.id = convertedParams.id || hash.randomString(12);
      convertedParams.created_by_id = req.rfcx.auth_token_info.owner_id;
      if (convertedParams.location) {
        return locationService.getById(convertedParams.location);
      }
      return null;
    })
    .then((location) => {
      if (location) {
        convertedParams.location_id = location.id;
      }
      return streamsService.create(convertedParams, true);
    })
    .then(streamsService.formatStream)
    .then(stream => res.status(201).json(stream))
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
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
  params.convert('location').optional().toString()

  let stream;

  return params.validate()
    .then(() => usersTimescaleDBService.ensureUserSynced(req))
    .then(() => streamsService.getById(streamId))
    .then(dbStream => {
      stream = dbStream;
      streamsService.checkUserAccessToStream(req, stream);
    })
    .then(() => {
      if (convertedParams.location) {
        return locationService.getById(convertedParams.location);
      }
      return null;
    })
    .then((location) => {
      if (location) {
        convertedParams.location_id = location.id;
      }
      return streamsService.update(stream, convertedParams, true);
    })
    .then(streamsService.formatStream)
    .then(json => res.status(200).json(json))
    .catch(httpErrorHandler(req, res, 'Failed updating stream'))
    .finally(() => stream = null);
})

/**
 * @swagger
 *
 * /streams:
 *   get:
 *     summary: Get list of streams (not yet implemented)
 *     description:
 *     tags:
 *       - streams
 *     parameters:
 *       - name: access
 *         description: Limit to streams `private`, `shared`
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: List of stream (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Invalid query parameters
 */
router.get("/", (req, res) => {
  res.sendStatus(504)
})

module.exports = router
