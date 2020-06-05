const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const ValidationError = require("../../../utils/converter/validation-error")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const detectionsService = require('../../../services/detections')
const classificationService = require('../../../services/classification/classification-service')
const Converter = require("../../../utils/converter/converter")

function checkAccess (streamId, req) {
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
 *       description: A single Detection object or consequetive Detections for a specific classification and classifier
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Detection'
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/requestBodies/Detection'
 *               - $ref: '#/components/requestBodies/DetectionsShortForm'
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
// router.post("/:streamId/detections", authenticatedWithRoles('rfcxUser'), function (req, res) {
//   const streamId = req.params.streamId
//   const convertedParams = {}
//   const params = new Converter(req.body, convertedParams)
//   params.convert('start').toMomentUtc()
//   params.convert('end').toMomentUtc()
//   params.convert('classification').toString()
//   params.convert('classifier').toInt()
//   params.convert('confidence').optional().toFloat()
//   params.convert('confidences').optional().toFloatArray()
//   params.convert('step').optional().toFloat()

//   return params.validate()
//     .then(() => checkAccess(streamId, req))
//     .then(() => classificationService.getId(convertedParams.classification))
//     .then(classificationId => {
//       let { start, end, classifier, confidence, confidences, step } = convertedParams

//       // Can specify either confidence (float) or confidences (array of floats)
//       if (confidence === undefined && confidences === undefined) {
//         throw new ValidationError('Either parameter "confidence" or "confidences" is required')
//       } else if (confidences !== undefined && step === undefined) {
//         throw new ValidationError('Parameter "step" is required with parameter "confidences"')
//       } else if (confidences === undefined) {
//         confidences = [confidence]
//       }

//       const detections = confidences.map((confidence, i) => {
//         // If there are mulitple confidences then they are spaced by "step" seconds
//         const offsetStart = start.clone().add(i * step, 's')
//         const offsetEnd = end.clone().add(i * step, 's')
//         return { streamId, classificationId, classifierId: classifier, start: offsetStart, end: offsetEnd, confidence }
//       })
//       return detectionsService.create(detections)
//     })
//     .then(detections => res.sendStatus(201))
//     .catch(httpErrorHandler(req, res, 'Failed creating annotation'))
// })

module.exports = router
