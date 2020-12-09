const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')
const classificationsService = require('../../../services/classification/classification-service')
const eventsService = require('../../../services/events')

/**
 * @swagger
 *
 * /events:
 *   post:
 *     summary: Create an event
 *     tags:
 *       - events
 *     requestBody:
 *       description: Event object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Event'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Event'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/events/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
router.post('/', function (req, res) { // authenticatedWithRoles('systemUser'),
  const params = new Converter(req.body, {}, true)
  params.convert('stream').toString()
  params.convert('classification').toString()
  params.convert('classifier_event_strategy').toInt()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('start_detection').toString()
  params.convert('end_detection').toString()

  return params.validate()
    .then(async convertedParams => {
      const { stream, classification, classifierEventStrategy, startDetection, endDetection, ...otherParams } = convertedParams
      const classificationId = await classificationsService.getId(classification)
      const event = {
        classificationId,
        streamId: stream,
        classifierEventStrategyId: classifierEventStrategy,
        startDetectionId: startDetection,
        endDetectionId: endDetection,
        ...otherParams
      }
      return eventsService.create(event)
    })
    .then(event => res.location(`/events/${event.id}`).status(201))
    .catch(httpErrorHandler(req, res, 'Failed creating event'))
})

module.exports = router
