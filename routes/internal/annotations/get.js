const { httpErrorHandler } = require('../../../utils/http-error-handler')
const Converter = require('../../../utils/converter/converter')
const detectionsService = require('../../../services/detections')

/**
 * @swagger
 * /internal/annotations
 *   get:
 *     summary: Get list of detections integrate with annotation
 *     description: -
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('streams').optional().toArray()
  converter.convert('projects').optional().toArray()
  converter.convert('classifications').optional().toArray()
  converter.convert('min_confidence').optional().toFloat()
  converter.convert('is_reviewed').optional().toBoolean()
  converter.convert('is_positive').optional().toBoolean()
  converter.convert('limit').optional().toInt().maximum(1000)
  converter.convert('offset').optional().toInt()

  converter.validate()
    .then(async (params) => {
      // const { start, end, streams, projects, classifications, minConfidence, isReviewed, isPositive, limit, offset } = params
      const result = await detectionsService.reviewQuery(params)
      return res.json(result)
    })
    .catch((e) => {
      console.log(e)
      httpErrorHandler(req, res, 'Failed getting annotations')(e)
    })
}
