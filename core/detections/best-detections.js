const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs/{jobId}/best-detections:
 *   get:
 *     summary: Get list of best detections
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
 *       - name: classification_ids
 *         description: Find best results for a given classification ids
 *         in: query
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: [3,4,5]
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
 *         description: Limit an end date before (iso8601 or epoch)
 *         in: query
 *         required: false
 *         type: string
 *         example: 2020-12-31T00:00:00.000Z
 *       - name: review_statuses
 *         description: Return rejected/uncertain/confirmed/unreviewed detections
 *         in: query
 *         type: string[]
 *         example: ['rejected', 'uncertain', 'confirmed', 'unreviewed']
 *       - name: n_per_chunk
 *         description: Maximum number of results per criterias (and per day if set)
 *         in: query
 *         type: int
 *         default: 100
 *       - name: fields
 *         description: Return additional fields from current or other models, Support fields from `Detection` model.
 *         in: query
 *         required: false
 *         type: string[]
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
  converter.convert('classification_ids').optional().toArray()
  converter.convert('by_date').default(false).toBoolean()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('review_statuses').optional().toArray()
  converter.convert('n_per_chunk').default(1).toInt().maximum(10)
  converter.convert('limit').optional().toInt().maximum(1000)
  converter.convert('offset').optional().toInt()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async (filters) => {
      const { limit, offset, fields } = filters

      filters.classifierJobId = jobId
      const options = {
        user,
        limit,
        offset,
        fields
      }
      const result = await dao.queryBestDetections(filters, options)

      return res.header('Total-Items', result.total).json(result.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
