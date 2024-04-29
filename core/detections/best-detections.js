const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs/{jobId}/best-detections:
 *   get:
 *     summary: Get list of detections
 *     description:
 *     tags:
 *       - detections
 *     parameters:
 *       - name: jobId
 *         description: Classifier Job identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: streams
 *         description: List of stream ids to limit results
 *         in: query
 *         type: array|string
 *       - name: by_date
 *         description: Find best detections per each date (instead of whole period)
 *         in: query
 *         type: boolean
 *         default: false
 *         example: true
 *       - name: start
 *         description: Limit a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: false
 *         type: string
 *         example: 2020-01-01T00:00:00.000Z
 *       - name: end
 *         description: Limit a start date before (iso8601 or epoch)
 *         in: query
 *         required: false
 *         type: string
 *         example: 2020-12-31T00:00:00.000Z
 *       - name: review_statuses
 *         description: Return rejected/uncertain/confirmed/unreviewed detections
 *         in: query
 *         type: string[]
 *         example: ['rejected', 'uncertain', 'confirmed', 'unreviewed']
 *       - name: n_per_stream
 *         description: Maximum number of results per stream (and per day if by_date is set)
 *         in: query
 *         type: int
 *         default: 100
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
 *         description: List of detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/:jobId/best-detections', (req, res) => {
  const user = req.rfcx.auth_token_info

  const { jobId } = req.params
  const converter = new Converter(req.query, {}, true)
  converter.convert('streams').optional().toArray()
  converter.convert('by_date').default(false).toBoolean()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('review_statuses').optional().toArray()
  converter.convert('n_per_stream').default(1).toInt().maximum(10)
  converter.convert('limit').optional().toInt().maximum(1000)
  converter.convert('offset').optional().toInt()

  return converter.validate()
    .then(async (filters) => {
      const { limit, offset } = filters
      filters.classifierJobId = jobId
      const options = {
        user,
        limit,
        offset
      }
      const result = await dao.queryBestDetections(filters, options)

      return res.header('Total-Items', result.total).json(result.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
