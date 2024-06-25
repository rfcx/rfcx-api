const Converter = require('../../common/converter')
const { httpErrorHandler } = require('../../common/error-handling/http')
const router = require('express').Router()
const dao = require('./dao')

/**
 * @swagger
 *
 * /classifier-jobs/{jobId}/best-detections/summary:
 *   get:
 *     summary: Get a summary of each detections based on given filters
 *     description:
 *     tags:
 *       - detections
 *     parameters:
 *       - name: jobId
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: 100
 *       - name: streams
 *         description: Find best results for a given stream ids
 *         in: query
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: ['x9ekbilso331']
 *       - name: classifications
 *         description: Find best results for a given classification values
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
 *         required: false
 *         schema:
 *           type: boolean
 *         default: false
 *         example: true
 *       - name: start
 *         description: Limit a start date on or after (iso8601 or epoch). Can only be passed in when `by_date` is set to `true`.
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: 2024-01-01T00:00:00.000Z
 *       - name: end
 *         description: Limit an end date before (iso8601 or epoch). Can only be passed in when `by_date` is set to `true`.
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: 2024-01-01T05:00:00.000Z
 *       - name: review_statuses
 *         description: Return only parts of calculations for given validation status, Other parts of the calculation will be 0. Possible values are `'rejected' | 'uncertain' | 'confirmed' | 'unreviewed'`
 *         in: query
 *         required: false
 *         explode: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: [unreviewed, rejected]
 *       - name: n_per_chunk
 *         description: Maximum number of results per stream (and per day if `by_date` is set to `true`)
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *           maximum: 10
 *         default: 1
 *     responses:
 *       200:
 *         description: Object with parameters of each review status with their counts by given filters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionsResultSummary'
 *       400:
 *         deescription: Cannot retrieve summary for `best per streams` with date ranges (`start` or `end` is given when `by_date` is false). Or other invalid query parameter errors.
 *       5XX:
 *         description: Other unrecoverable errors.
 */
router.get('/:jobId/best-detections/summary', (req, res) => {
  const user = req.rfcx.auth_token_info

  const { jobId } = req.params
  const converter = new Converter(req.query, {}, true)
  converter.convert('streams').optional().toArray()
  converter.convert('classifications').optional().toArray()
  converter.convert('by_date').default(false).toBoolean()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('review_statuses').optional().toArray()
  converter.convert('n_per_chunk').default(1).toInt().maximum(10)

  return converter.validate().then(async (filters) => {
    filters.classifierJobId = jobId
    const options = { user }

    const response = await dao.queryBestDetectionsSummary(filters, options)
    return res.json(response)
  }).catch(httpErrorHandler(req, res, 'Failed getting best detections summary'))
})

module.exports = router
