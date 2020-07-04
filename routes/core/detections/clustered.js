const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const detectionsService = require('../../../services/detections')
const Converter = require('../../../utils/converter/converter')
const models = require('../../../modelsTimescale')

/**
 * @swagger
 *
 * /clustered-detections:
 *   get:
 *     summary: Get detections as clusters based on an aggregate function
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
 *         default: id
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
router.get('/', authenticatedWithRoles('rfcxUser'), (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('stream_id').optional().toString()
  params.convert('interval').default('1d').toTimeInterval()
  params.convert('aggregate').default('count').toAggregateFunction()
  params.convert('field').default('id').isEqualToAny(models.Detection.attributes.full)
  params.convert('descending').default(false).toBoolean()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  return params.validate()
    .then(() => {
      const streamId = convertedParams.stream_id
      const { start, end, interval, aggregate, field, descending, limit, offset } = convertedParams
      return detectionsService.timeAggregatedQuery(start, end, streamId, interval, aggregate, field, descending, limit, offset)
    })
    .then(detections => res.json(detections))
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
