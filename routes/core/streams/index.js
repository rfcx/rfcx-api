const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const locationService = require('../../../services/location/location-service');
// const annotationsService = require('../../../services/annotations')
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
 *               $ref: '#/components/schemas/StreamLite'
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
      return streamsService.create(convertedParams);
    })
    .then(stream => res.status(201).json(stream))
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
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
