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
  const converter = new Converter(req.body, {}, true)
  converter.convert('status').toString().isEqualToAny(['rejected', 'uncertain', 'confirmed'])
  return converter.validate()
    .then(async (params) => {
      return await createOrUpdate({
        userId: req.rfcx.auth_token_info.id,
        streamId: req.params.streamId,
        start: req.params.start,
        status: params.status
      })
    })
    .then(({ review, created }) => res.location(`/detections/reviews/${review.id}`).sendStatus(created ? 201 : 204))
    .catch(httpErrorHandler(req, res, 'Failed reviewing the detection'))
})

module.exports = router
