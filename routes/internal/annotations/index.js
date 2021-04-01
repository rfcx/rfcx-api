const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 * /internal/annotations
 *   get:
 *     summary: Get list of annotations
 *     description: -
 *     tags:
 *       - internal
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', async (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams, true)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('streams').optional().toArray()
  params.convert('projects').optional().toArray()
  params.convert('classifications').optional().toArray()
  params.convert('min_confidence').optional().toFloat()
  params.convert('is_reviewed').optional().toBoolean()
  params.convert('is_positive').optional().toBoolean()
  params.convert('limit').optional().toInt().maximum(1000)
  params.convert('offset').optional().toInt()

  try {
    await params.validate()
    const { start, end, streams, projects, classifications, minConfidence, isReviewed, isPositive, limit, offset } = convertedParams
    return res.send({ start, end, streams, projects, classifications, minConfidence, isReviewed, isPositive, limit, offset })
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting annotations')
  }
})

module.exports = router
