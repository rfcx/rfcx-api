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
 *     description: Creates or updates a review for a detection matching stream, start, classification value, classifier, and classifier job.
 *     tags:
 *       - detections
 *     parameters:
 *       - name: streamId
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *         example: mmx2039d8fl1
 *       - name: start
 *         description: Segment start timestamp (compact iso8601 or epoch)
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         example: 2023-08-12T12:28:25.000Z
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/DetectionReviewBody'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/DetectionReviewBody'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: 'OK'
 *       400:
 *         description: Invalid query parameters
 *       5XX:
 *         description: Other irrecoverable errors
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
    .then(() => res.sendStatus(200))
    .catch(httpErrorHandler(req, res, 'Failed reviewing the detection'))
})

module.exports = router
