const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http.js')
const detectionsService = require('../../detections/dao/create')
const Converter = require('../../../common/converter')
const { hasRole } = require('../../../common/middleware/authorization/authorization')

/**
 * @swagger
 *
 * /internal/prediction/detections:
 *   post:
 *     summary: Create a sequence of detections for a classification by a classifier
 *     description: This endpoint is only accessible to the prediction service
 *     tags:
 *       - internal
 *     requestBody:
 *       description: A short form for a sequence of consequetive detections for a specific classification and classifier
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/DetectionsCompact'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post('/detections', hasRole(['systemUser']), function (req, res) {
  const converter = new Converter(req.body, {}, true)
  converter.convert('stream_id').toString()
  converter.convert('classifier_id').toInt()
  converter.convert('classification').toString()
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('confidences').toFloatArray()
  converter.convert('step').toFloat()

  converter.validate()
    .then(async (params) => {
      const { streamId, classifierId, classification, start, end, confidences, step } = params

      const expandedDetections = confidences.map((confidence, i) => {
        // Detections are spaced by "step" seconds
        const offsetStart = start.clone().add(i * step, 's')
        const offsetEnd = end.clone().add(i * step, 's')
        return {
          streamId,
          classifier: classifierId,
          classification,
          start: offsetStart,
          end: offsetEnd,
          confidence
        }
      })

      await detectionsService.create(expandedDetections)

      return res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
