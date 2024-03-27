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
 *     description: Creates or updates reviews for any detections matching stream and start
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
 *         description: Review status ('rejected', 'uncertain', 'confirmed', 'unreviewed')
 *         in: query
 *         type: string
 *       - name: classification
 *         description: Classification value
 *         in: query
 *         required: true
 *         type: string
 *       - name: classifier
 *         description: Classifier id
 *         in: query
 *         required: true
 *         type: number
 *       - name: classifier_job
 *         description: Classifier job id
 *         in: query
 *         type: number
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Invalid query parameters
 */
router.post('/:streamId/detections/:start/review', (req, res) => {
  const userId = req.rfcx.auth_token_info.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('status').toString().isEqualToAny(['unreviewed', 'rejected', 'uncertain', 'confirmed'])
  converter.convert('classification').toString()
  converter.convert('classifier').toInt()
  converter.convert('classifier_job').optional().toInt()
  return converter.validate()
    .then(async (params) => {
      const { streamId, start } = req.params
      const { status, classification, classifier, classifierJob } = params
      return await createOrUpdate({ userId, streamId, start, status, classification, classifier, classifierJob })
    })
    .then(() => res.send(200))
    .catch(httpErrorHandler(req, res, 'Failed reviewing the detection'))
})

module.exports = router
