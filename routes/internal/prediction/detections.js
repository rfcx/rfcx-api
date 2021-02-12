const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const detectionsService = require('../../../services/detections')
const classificationService = require('../../../services/classifications')
const classifierService = require('../../../services/classifiers')
const Converter = require('../../../utils/converter/converter')
const { hasRole } = require('../../../middleware/authorization/authorization')

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
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('stream_id').toString()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('classifier_id').toInt()
  params.convert('confidences').toFloatArray()
  params.convert('step').toFloat()

  return params.validate()
    .then(() => classificationService.getId(convertedParams.classification))
    .then(classificationId => {
      const classifier = classifierService.get(convertedParams.classifier_id, { joinRelations: true })
      classifierService.update(classificationId, null, { last_executed_at: new Date() })
      return Promise.all([classifier, classificationId])
    })
    .then(([classifier, classificationId]) => {
      const streamId = convertedParams.stream_id
      const classifierId = convertedParams.classifier_id
      const { start, end, confidences, step } = convertedParams
      const threshold = classifier.outputs.find(i => i.classification_id === classificationId).ignore_threshold

      const detections = confidences.map((confidence, i) => {
        // Confidences then they are spaced by "step" seconds
        const offsetStart = start.clone().add(i * step, 's')
        const offsetEnd = end.clone().add(i * step, 's')
        return {
          streamId,
          classificationId,
          classifierId,
          start: offsetStart,
          end: offsetEnd,
          confidence: confidence
        }
      })
      return detectionsService.create(detections.filter(d => d.confidence > threshold))
    })
    .then(detections => res.sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
