const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { hasPermission } = require('../../../middleware/authorization/streams')
const indicesService = require('../../../services/indices/values')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /streams/{id}/indices/{index}/values:
 *   get:
 *     summary: Get acoustic index values
 *     tags:
 *       - indices
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: index
 *         description: Index code
 *         in: path
 *         required: true
 *         type: string
 *       - name: interval
 *         description: Time interval for aggregate results. Supported intervals `d` (day), `h` (hour), `m` (minute), `s` (second). Defaults to no aggregation (returns all values).
 *         in: query
 *         schema:
 *           type: string
 *         examples:
 *           hours:
 *             value: 3h
 *           minutes:
 *             value: 15m
 *           seconds:
 *             value: 90s
 *       - name: aggregate
 *         description: Aggregate function to apply. Supported functions `avg`, `min`, `max`.
 *         in: query
 *         schema:
 *           type: string
 *         default: count
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
 *         description: List of index value (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IndexValue'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/:streamId/indices/:index/values', hasPermission('read'), (req, res) => {
  const streamId = req.params.streamId
  const index = req.params.index

  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('interval').optional().toTimeInterval()
  params.convert('aggregate').default('avg').toAggregateFunction()
  params.convert('descending').default(false).toBoolean()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  return params.validate()
    .then(() => {
      const { start, end, interval, aggregate, descending, limit, offset } = convertedParams
      if (interval === undefined) {
        return indicesService.query(streamId, index, start, end, descending, limit, offset)
      }
      return indicesService.timeAggregatedQuery(streamId, index, start, end, interval, aggregate, descending, limit, offset)
        .then(values => values.map(x => ({ time: x.time_bucket, value: x.aggregated_value })))
    })
    .then(values => res.json(values))
    .catch(httpErrorHandler(req, res, 'Failed getting values'))
})

/**
 * We could do it like this... or we could use the Accept (content type)
 * to return either json or image (or csv?)
 *
 * @swagger
 *
 * /streams/{streamId}/indices/{indexId}/heatmap:
 *   get:
 *     summary:
 *     description:
 *     tags:
 *       - indices
 */
// router.get('/indices/:indexId/heatmap')

module.exports = router
