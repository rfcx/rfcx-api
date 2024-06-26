const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const indicesService = require('../../indices/dao/values')
const Converter = require('../../../common/converter')
const heatmapGenerate = require('../../internal/explorer/heatmaps/generate')
const heatmapDistribute = require('../../internal/explorer/heatmaps/distribute')
const storageService = require('../../_services/storage')
const { hasStreamPermission } = require('../../../common/middleware/authorization/roles')

/**
 * @swagger
 *
 * /internal/explorer/streams/{streamId}/indices/{indexId}/heatmap:
 *   get:
 *     summary:
 *     description:
 *     tags:
 *       - internal
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
router.get('/streams/:id/indices/:index/heatmap', hasStreamPermission('R'), (req, res) => {
  const streamId = req.params.id
  const index = req.params.index

  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('interval').default('15m').toTimeInterval()
  params.convert('grouping').default('1d').toTimeInterval()
  params.convert('aggregate').default('avg').toAggregateFunction()

  return params.validate()
    .then(async () => {
      const { start, end, interval, aggregate, grouping } = convertedParams
      const storageFilePath = indicesService.getHeatmapStoragePath(streamId, start, end, interval, aggregate)
      const exists = await storageService.exists(storageService.buckets.streamsCache, storageFilePath)
      if (exists) {
        return storageService.getReadStream(storageService.buckets.streamsCache, storageFilePath).pipe(res)
      } else {
        const values = await indicesService.timeAggregatedQuery(streamId, index, start, end, interval, aggregate, false, undefined, 0)
        const heatmapData = heatmapDistribute(start, end, interval, grouping, values)
        const buffer = await heatmapGenerate(heatmapData)
        storageService.uploadBuffer(storageService.buckets.streamsCache, storageFilePath, buffer) // it's async, but we don't wait for it
        res.set('Content-Type', 'image/png')
        res.send(buffer)
      }
    })
    .catch(httpErrorHandler(req, res, 'Failed getting values'))
})

module.exports = router
