const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const detectionsService = require('../_services/detections')
const createDetectionsService = require('../_services/detections/create')
const streamsService = require('../_services/streams')
const { hasPermission, READ, UPDATE, STREAM } = require('../_services/roles')
const Converter = require('../../utils/converter/converter')
const ArrayConverter = require('../../utils/converter/array-converter')
const ForbiddenError = require('../../utils/converter/forbidden-error')

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
 *       - name: min_confidence
 *         description: Return results above a minimum confidence (by default will return above minimum confidence of the classifier)
 *         in: query
 *         type: float
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/detections', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classifications').optional().toArray()
  params.convert('min_confidence').optional().toFloat()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  params.validate()
    .then(async () => {
      // TODO add readableBy to detectionsService.query to avoid permission checks in route handler
      if (!user.has_system_role && !user.stream_token && !await hasPermission(READ, user, streamId, STREAM)) {
        throw new ForbiddenError('You do not have permission to read this stream')
      }

      const { start, end, classifications, limit, offset } = convertedParams
      const minConfidence = convertedParams.min_confidence
      const result = await detectionsService.query(start, end, streamId, classifications, minConfidence, limit, offset, user)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

/**
 * @swagger
 *
 * /streams/{id}/detections:
 *   post:
 *     summary: Create a detection belonging to a stream
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
router.post('/:id/detections', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const detections = Array.isArray(req.body) ? req.body : [req.body]

  const params = new ArrayConverter(detections)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('classifier').toString()
  params.convert('confidence').toFloat()

  params.validate()
    .then(async () => {
      // TODO add creatableBy to detectionsService.create to avoid permission checks and stream existance checks in route handler
      if (user.has_system_role) {
        // Need to check that the stream exists (throws)
        await streamsService.get(streamId, { fields: ['id'] })
      } else if (!await hasPermission(UPDATE, user, streamId, STREAM)) {
        throw new ForbiddenError('You do not have permission to update this stream')
      }

      const detections = params.transformedArray.map(d => ({ ...d, streamId }))
      await createDetectionsService.create(detections)
      return res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
