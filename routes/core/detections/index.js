const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler')
const detectionsService = require('../../../services/detections')
const roleService = require('../../../services/roles')
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
 *       - name: streams
 *         description: List of stream ids to limit results
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
 *
 *     responses:
 *       200:
 *         description: List of detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('streams').optional().toArray()
  params.convert('classifications').optional().toArray()
  params.convert('min_confidence').optional().toFloat()
  params.convert('limit').optional().toInt().maximum(1000000)
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      const streamIds = convertedParams.streams
      const minConfidence = convertedParams.min_confidence
      const { start, end, classifications, limit, offset } = convertedParams
      const allowedStreams = streamIds ? await roleService.getAccessibleObjectsIDs(user.owner_id, 'stream', streamIds) : undefined
      const result = await detectionsService.query(start, end, allowedStreams, classifications, minConfidence, limit, offset, user)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
