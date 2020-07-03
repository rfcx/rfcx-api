const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { hasPermission } = require('../../../middleware/authorization/streams')
const indicesService = require('../../../services/indices/values')
const Converter = require('../../../utils/converter/converter')
const heatmapGenerate = require('../../internal/explorer/heatmaps/generate')
const heatmapDistribute = require('../../internal/explorer/heatmaps/distribute')

/**
 * @swagger
 *
 * /internal/explorer/streams/{streamId}/indices/{indexId}/heatmap:
 *   get:
 *     summary:
 *     description:
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
 *         description: Horizontal resolution (e.g. 15m => 1 pixel represents 15 minutes). Defaults to 15m.
 *         in: query
 *         schema:
 *           type: string
 *         example: 5m
 *       - name: grouping
 *         description: Vertical resolution (e.g. 1d => 1 row of pixels represents 1 day). Defaults to 1d.
 *         in: query
 *         schema:
 *           type: string
 *         example: 1d
 *       - name: aggregate
 *         description: Aggregate function to apply. Supported functions `avg`, `min`, `max`. Defaults to `avg`.
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
 *     responses:
 *       200:
 *         description: A heatmap image
 *         content:
 *           image/png:
 *       400:
 *         description: Invalid query parameters
 */
router.get('/streams/:streamId/indices/:index/heatmap', hasPermission('read'), (req, res) => {
  const streamId = req.params.streamId
  const index = req.params.index

  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('interval').default('15m').toTimeInterval()
  params.convert('grouping').default('1d').toTimeInterval()
  params.convert('aggregate').default('avg').toAggregateFunction()

  return params.validate()
    .then(() => {
      const { start, end, interval, aggregate } = convertedParams
      return indicesService.timeAggregatedQuery(streamId, index, start, end, interval, aggregate, false, undefined, 0)
    })
    .then(values => {
      const { start, end, interval, grouping } = convertedParams
      const heatmapData = heatmapDistribute(start, end, interval, grouping, values)
      return heatmapGenerate(heatmapData)
    })
    .then(buffer => {
      res.set('Content-Type', 'image/png')
      res.send(buffer)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting values'))
})

module.exports = router
