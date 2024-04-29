const router = require('express').Router()
const Converter = require('../../common/converter')
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')

/**
 * @swagger
 *
 * /detections/summary:
 *   get:
 *     summary: Get counts of detections on each validation status based on given filters
 *     description:
 *     tags:
 *       - detections
 *     parameters:
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: 2020-01-01T00:00:00.000Z
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         example: 2020-02-01T00:00:00.000Z
 *       - name: streams
 *         description: List of stream ids to limit results
 *         in: query
 *         required: false
 *         explode: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: ['km4ifoutpx9W']
 *       - name: classifications
 *         description: List of classification values to limit results
 *         in: query
 *         required: false
 *         explode: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: [scirus_carolinenses_simple_call_1]
 *       - name: classifiers
 *         description: List of classifier ids to limit results
 *         in: query
 *         required: false
 *         explode: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: ['12']
 *       - name: classifier_jobs
 *         description: List of classifier job ids
 *         in: query
 *         required: false
 *         explode: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         example: ['7']
 *       - name: min_confidence
 *         description: Limit results to have detections count higher than the threshold
 *         in: query
 *         required: false
 *         type: float
 *         example: 0.95
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
 *
 *     responses:
 *       200:
 *         description: Object with parameters of each review status with their counts by given filters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionsResultSummary'
 *       400:
 *         description: Invalid query parameters
 *       5XX:
 *         description: other errors from the server
 */
router.get('/summary', (req, res) => {
  const user = req.rfcx.auth_token_info

  const converter = new Converter(req.query, {}, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('streams').optional().toArray()
  converter.convert('projects').optional().toArray()
  converter.convert('classifications').optional().toArray()
  converter.convert('classifiers').optional().toArray()
  converter.convert('classifier_jobs').optional().toArray()
  converter.convert('min_confidence').optional().toFloat()
  converter.convert('review_statuses').optional().toArray().isEqualToAny(['unreviewed', 'rejected', 'uncertain', 'confirmed'])

  return converter.validate()
    .then(async (filters) => {
      const result = await dao.queryDetectionsSummary(filters, { user })
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections summary'))
})

module.exports = router
