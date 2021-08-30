const { httpErrorHandler } = require('../../../utils/http-error-handler')
const detectionsService = require('../../../services/detections')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /detections:
 *   get:
 *     summary: Get list of detections
 *     description:
 *     tags:
 *       - detections
 *     parameters:
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *         example: 2020-01-01T00:00:00.000Z
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *         example: 2020-12-31T00:00:00.000Z
 *       - name: projects
 *         description: List of project ids to limit results
 *         in: query
 *         type: array|string
 *       - name: streams
 *         description: List of stream ids to limit results
 *         in: query
 *         type: array|string
 *       - name: classifiers
 *         description: List of classifiers
 *         in: query
 *         type: array|string
 *       - name: classifications
 *         description: List of clasification values
 *         in: query
 *         type: array|string
 *       - name: min_confidence
 *         description: Return results above a minimum confidence
 *         in: query
 *         type: float
 *         example: 0.95
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
 *       - name: descending
 *         description: Order the results in descending order (newest first)
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of detections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super
  const hasSystemRole = req.rfcx.auth_token_info.has_system_role
  const converter = new Converter(req.query, {}, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('streams').optional().toArray()
  converter.convert('projects').optional().toArray()
  converter.convert('classifiers').optional().toArray()
  converter.convert('classifications').optional().toArray()
  converter.convert('min_confidence').optional().toFloat()
  converter.convert('is_reviewed').optional().toBoolean()
  converter.convert('is_positive').optional().toBoolean()
  converter.convert('limit').default(100).toInt().maximum(1000)
  converter.convert('offset').default(0).toInt()
  converter.convert('descending').default(false).toBoolean()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async (params) => {
      const { limit, offset, fields, descending, ...filters } = params
      const options = {
        limit,
        offset,
        readableBy: userIsSuper || hasSystemRole ? undefined : userId,
        userId,
        descending,
        fields
      }
      const result = await detectionsService.query(filters, options)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
}
