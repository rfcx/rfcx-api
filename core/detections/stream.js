const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const { query } = require('./dao')
const { create } = require('./bl')
const streamDao = require('../streams/dao')
const { hasPermission, READ, UPDATE, STREAM } = require('../roles/dao')
const Converter = require('../../common/converter')
const ArrayConverter = require('../../common/converter/array')
const { ForbiddenError } = require('../../common/error-handling/errors')

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
  const converter = new Converter(req.query, convertedParams, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('classifications').optional().toArray()
  converter.convert('min_confidence').optional().toFloat()
  converter.convert('limit').optional().toInt()
  converter.convert('offset').optional().toInt()

  converter.validate()
    .then(async (filters) => {
      // TODO add readableBy to dao.query to avoid permission checks in route handler
      if (!user.has_system_role && !user.stream_token && !await hasPermission(READ, user, streamId, STREAM)) {
        throw new ForbiddenError('You do not have permission to read this stream')
      }
      const { offset, limit, descending, fields } = filters
      const options = {
        offset,
        limit,
        descending,
        fields,
        user
      }
      const result = await query(filters, options)
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
  const rawDetections = Array.isArray(req.body) ? req.body : [req.body]

  const converter = new ArrayConverter(rawDetections, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('classification').toString()
  converter.convert('classifier').toString()
  converter.convert('confidence').toFloat()
  converter.convert('classifier_job_id').optional().toInt()

  converter.validate()
    .then(async (detections) => {
      // TODO add creatableBy to dao.create to avoid permission checks and stream existance checks in route handler
      if (user.has_system_role) {
        // Need to check that the stream exists (throws)
        await streamDao.get(streamId, { fields: ['id'] })
      } else if (!await hasPermission(UPDATE, user, streamId, STREAM)) {
        throw new ForbiddenError('You do not have permission to update this stream')
      }

      await create(detections.map(d => ({ ...d, streamId })))
      return res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
