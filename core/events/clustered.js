const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const models = require('../_models')

/**
 * @swagger
 *
 * /clustered-events:
 *   get:
 *     summary: Get events as clusters based on an aggregate function
 *     description: Perform event search across streams and classifications
 *     tags:
 *       - events
 *     parameters:
 *       - name: interval
 *         description: Time interval for aggregate results. Supported intervals `d` (day), `h` (hour), `m` (minute), `s` (second).
 *         in: query
 *         schema:
 *           type: string
 *         default: 1d
 *         examples:
 *           days:
 *             value: 1d
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
 *       - name: streams
 *         description: List of stream ids to limit results
 *         in: query
 *         type: array|string
 *         example: xu82jDgX49
 *         required: true
 *       - name: classifications
 *         description: Limit results to classification values
 *         in: query
 *         type: array|string
 *         example: porosus
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
 *         description: List of cluster event (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventCluster'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user.is_super || user.has_system_role ? undefined : user.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('streams').toArray()
  params.convert('classifications').optional().toArray()
  params.convert('interval').default('1d').toTimeInterval()
  params.convert('aggregate').default('count').toAggregateFunction()
  params.convert('field').default('start').isEqualToAny(models.Event.attributes.full)
  params.convert('descending').default(false).toBoolean()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  return params.validate()
    .then(async () => {
      const { start, end, streams, classifications, interval, aggregate, field, descending, limit, offset } = convertedParams
      const filters = { start, end, streamIds: streams, classificationValues: classifications }
      const options = { readableBy, descending, limit, offset, field, interval, aggregate }
      return dao.timeAggregatedQuery(filters, options)
    })
    .then(events => res.json(events))
    .catch(httpErrorHandler(req, res, 'Failed getting events'))
})

module.exports = router
