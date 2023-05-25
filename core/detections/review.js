const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const { createOrUpdate } = require('./bl/review')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /streams/{streamId}/detections/{start}/review:
 *   post:
 *     summary: Review a detection
 *     description:
 *     tags:
 *       - detections
 *     parameters:
 *       - name: streamId
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Segment start timestamp (compact iso8601 or epoch)
 *         in: path
 *         required: true
 *         type: string
 *       - name: status
 *         description: Review status ('rejected', 'uncertain', 'confirmed')
 *         in: query
 *         type: string
 *       - name: classification
 *         description: Classification value
 *         in: query
 *         type: string
 *       - name: classifier_id
 *         description: Classifier id
 *         in: query
 *         type: number
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/detections/reviews/xyz123`)
 *             schema:
 *               type: string
 *       204:
 *         description: Updated
 *         headers:
 *           Location:
 *             description: Path of the updated resource (e.g. `/detections/reviews/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
router.post('/:streamId/detections/:start/review', (req, res) => {
  const userId = req.rfcx.auth_token_info.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('status').toString().isEqualToAny(['rejected', 'uncertain', 'confirmed'])
  converter.convert('classification').toString()
  converter.convert('classifier_id').toInt()
  return converter.validate()
    .then(async (params) => {
      const { streamId, start } = req.params
      const { status, classification, classifierId } = params
      return await createOrUpdate({ userId, streamId, start, status, classification, classifierId })
    })
    .then(() => res.send(200))
    .catch(httpErrorHandler(req, res, 'Failed reviewing the detection'))
})

module.exports = router
