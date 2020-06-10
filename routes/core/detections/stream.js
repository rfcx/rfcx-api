const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const ValidationError = require("../../../utils/converter/validation-error")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const detectionsService = require('../../../services/detections')
const classificationService = require('../../../services/classification/classification-service')
const Converter = require("../../../utils/converter/converter")
const ArrayConverter = require("../../../utils/converter/array-converter")

function checkAccess (streamId, req) {
  if ((req.rfcx.auth_token_info.roles || []).includes('systemUser')) {
    return true
  }
  return streamsService.getStreamByGuid(streamId)
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
}

/**
 * @swagger
 *
 * /streams/{id}/detections:
 *   get:
 *     summary: Get list of detections belonging to a stream
 *     tags:
 *       - detections
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
 *         type: array
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
 *         description: List of detections (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DetectionLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get("/:streamId/detections", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classifications').optional().toArray()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(() => checkAccess(streamId, req))
    .then(() => {
      const { start, end, classifications, limit, offset } = convertedParams
      return detectionsService.query(start, end, streamId, classifications, limit, offset)
    })
    .then((detections) => res.json(detections))
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

/**
 * @swagger
 *
 * /streams/{id}/detections:
 *   post:
 *     summary: Create an annotation belonging to a stream
 *     tags:
 *       - detections
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: A single detection object or multiple detections (supports multiple classification values in a single request)
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Detection'
 *         application/json:
 *           schema:
 *             anyOf:
 *               - $ref: '#/components/requestBodies/Detection'
 *               - type: array
 *                 items:
 *                   - $ref: '#/components/requestBodies/Detection'
 *             example:
 *               - start: '2020-05-19T09:35:03.500Z'
 *                 end: '2020-05-19T09:35:05.500Z'
 *                 classification: obscura
 *                 classifier: 1
 *                 confidence: 0.967814
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post("/:streamId/detections", authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const streamId = req.params.streamId
  const detections = Array.isArray(req.body) ? req.body : [req.body]

  const params = new ArrayConverter(detections)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('classifier').toInt()
  params.convert('confidence').toFloat()

  return params.validate()
    .then(() => checkAccess(streamId, req))
    .then(() => {
      const validatedDetections = params.transformedArray
      // Get all the distinct classification values
      const classificationValues = [...new Set(validatedDetections.map(d => d.classification))]
      return classificationService.getIds(classificationValues)
    })
    .then(classificationMapping => {
      const validatedDetections = params.transformedArray
      const detections = validatedDetections.map(detection => {
        const classificationId = classificationMapping[detection.classification]
        return {
          streamId,
          classificationId,
          classifierId: detection.classifier,
          start: detection.start,
          end: detection.end,
          confidence: detection.confidence
        }
      })
      return detectionsService.create(detections)
    })
    .then(detections => res.sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
