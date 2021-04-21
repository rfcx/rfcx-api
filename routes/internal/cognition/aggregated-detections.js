const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const Converter = require('../../../utils/converter/converter')
const aggregateQuery = require('./services/aggregate-query')

/**
 * @swagger
 *
 * /internal/cognition/aggregated-detections:
 *   get:
 *     summary: Get detections using an aggregate function
 *     description: Perform detection search across streams and classifications
 *     tags:
 *       - detections
 *     parameters:
 *       - name: interval
 *         description: Time interval for aggregate results. Supported intervals `d` (day), `h` (hour), `m` (minute), `s` (second).
 *         in: query
 *         schema:
 *           type: string
 *         default: 1d
 *         examples:
 *           hours:
 *             value: 3h
 *           minutes:
 *             value: 15m
 *           seconds:
 *             value: 90s
 *       - name: aggregate
 *         description: Aggregate function to apply. Supported functions `avg`, `count`, `min`, `max`, `sum`.
 *         in: query
 *         schema:
 *           type: string
 *         default: count
 *       - name: field
 *         description: Column or field to apply the function.
 *         schema:
 *           type: string
 *         default: start
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: stream_id
 *         description: Limit results to a selected stream
 *         in: query
 *         type: string
 *       - name: min_confidence
 *         description: Return results above a minimum confidence (by default will return above minimum confidence of the classifier)
 *         in: query
 *         type: float
 *       - name: descending
 *         description: Order by descending time (most recent first)
 *         in: query
 *         type: boolean
 *         default: false
 *         example: true
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
 *         description: List of cluster detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DetectionCluster'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('classifier').toInt()
  converter.convert('min_confidence').toFloat()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()

  return converter.validate()
    .then(params => aggregateQuery(params))
    .then(detections => res.json(detections))
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
