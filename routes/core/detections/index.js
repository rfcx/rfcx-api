const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler')
const detectionsService = require('../../../services/detections')
const models = require('../../../modelsTimescale')
const roleService = require('../../../services/roles')
const Converter = require('../../../utils/converter/converter')
const { ForbiddenError } = require('../../../utils/errors')

/**
 * @swagger
 *
 * /detections:
 *   get:
 *     summary: Get list of detections (not yet implemented)
 *     description:
 *     tags:
 *       - detections
 *     parameters:
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
 *       - name: classifications
 *         description: List of clasification values
 *         in: query
 *         type: array|string
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
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      const streamIds = convertedParams.streams
      console.log('Stream ids', streamIds)
      if (streamIds) {
        for (const id of streamIds) {
          const allowed = await roleService.hasPermission(roleService.READ, user, id, roleService.STREAM)
          if (!allowed) {
            throw new ForbiddenError(`You do not have permission to access this stream: ${id}`)
          }
        }
      }
      const minConfidence = convertedParams.min_confidence
      const { start, end, classifications, limit, offset } = convertedParams
      const result = await detectionsService.query(start, end, streamIds, classifications, minConfidence, limit, offset, user)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
