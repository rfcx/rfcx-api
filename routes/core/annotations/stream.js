const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const Converter = require("../../../utils/converter/converter")

function checkAccess (streamId, req) {
  return streamsService.getStreamByGuid(streamId)
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
}

/**
 * @swagger
 *
 * /streams/{id}/annotations:
 *   get:
 *     summary: Get list of annotations belonging to a stream
 *     tags:
 *       - annotations
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: End timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: classifications
 *         description: List of clasification identifiers
 *         in: query
 *         type: array|int
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
 *         description: List of annotation (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AnnotationLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get("/:streamId/annotations", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classifications').optional().toIntArray()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(() => checkAccess(streamId, req))
    .then(() => {
      const { start, end, classifications, limit, offset } = convertedParams
      return annotationsService.query(start, end, streamId, classifications, limit, offset)
    })
    .then((annotations) => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

/**
 * @swagger
 *
 * /streams/{id}/annotations:
 *   post:
 *     summary: Create an annotation belonging to a stream
 *     tags:
 *       - annotations
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Annotation object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Annotation'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Annotation'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnnotationFull'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post("/:streamId/annotations", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const userId = req.rfcx.auth_token_info.owner_id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classification').toInt()
  params.convert('frequency_min').toInt()
  params.convert('frequency_max').toInt()

  return params.validate()
    .then(() => checkAccess(streamId, req))
    .then(() => {
      const { start, end, classification, frequency_min, frequency_max } = convertedParams
      return annotationsService.create(streamId, start, end, classification, frequency_min, frequency_max, userId)
    })
    .then(annotation => res.status(201).json(annotation))
    .catch(httpErrorHandler(req, res, 'Failed creating annotation'))
})

module.exports = router
