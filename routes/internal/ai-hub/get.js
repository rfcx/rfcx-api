const { httpErrorHandler } = require('../../../utils/http-error-handler')
const Converter = require('../../../utils/converter/converter')
const reviewsService = require('../../../services/detections/reviews')

/**
 * @swagger
 * /internal/ai-hub/reviews
 *   get:
 *     summary: Get list of detections integrate with annotations
 *     description: -
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 */
module.exports = (req, res) => {
  const userId = req.rfcx.auth_token_info.id
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

  converter.validate()
    .then(async (params) => {
      const { limit, offset, ...filters } = params
      const options = { limit, offset, userId }
      const results = await reviewsService.query(filters, options)
      return res.json(results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
}
