const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const detectionsService = require('../../../services/detections')
const classificationService = require('../../../services/classification/classification-service')
const Converter = require("../../../utils/converter/converter")


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
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Detection'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/DetectionsShortForm'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post("/detections", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('stream').toString()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('classifier').toInt()
  params.convert('confidences').toFloatArray()
  params.convert('step').toFloat()

  return params.validate()
    .then(() => classificationService.getId(convertedParams.classification))
    .then(classificationId => {
      let { stream, start, end, classifier, confidences, step } = convertedParams
      const detections = confidences.map((confidence, i) => {
        // Confidences then they are spaced by "step" seconds
        const offsetStart = start.clone().add(i * step, 's')
        const offsetEnd = end.clone().add(i * step, 's')
        return { streamId, classificationId, classifierId: classifier, start: offsetStart, end: offsetEnd, confidence }
      })
      return detectionsService.create(detections)
    })
    .then(detections => res.sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
