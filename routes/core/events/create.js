const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { ValidationError } = require('../../../utils/errors')
const Converter = require('../../../utils/converter/converter')
const classificationsService = require('../../../services/classifications')
const createEvent = require('../../../services/events/create')

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
module.exports = function (req, res, next) {
  const converter = new Converter(req.body, {}, true)
  converter.convert('stream').toString()
  converter.convert('classification').toString()
  converter.convert('classifier_event_strategy').toInt()
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()

  converter.validate().then(async (params) => {
    const { classifierEventStrategy: classifierEventStrategyId, stream: streamId, start, end } = params
    let classification
    try {
      classification = await classificationsService.get(params.classification)
    } catch (err) {
      throw new ValidationError('Classification not found')
    }
    const event = {
      classificationId: classification.id,
      streamId,
      classifierEventStrategyId,
      start,
      end
    }
    const eventId = await createEvent(event)
    res.location(`/events/${eventId}`).sendStatus(201)
  }).catch(httpErrorHandler(req, res, 'Failed creating event'))
}
