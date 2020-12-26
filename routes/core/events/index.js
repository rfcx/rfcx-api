const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')
const classificationsService = require('../../../services/classifications')
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
router.post('/', authenticatedWithRoles('systemUser'), function (req, res) {
  const params = new Converter(req.body, {}, true)
  params.convert('stream').toString()
  params.convert('classification').toString()
  params.convert('classifier_event_strategy').toInt()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('first_detection').toString()
  params.convert('last_detection').toString()

  return params.validate()
    .then(async convertedParams => {
      const { stream, classification, classifierEventStrategy, firstDetection, lastDetection, ...otherParams } = convertedParams
      const classificationId = await classificationsService.getId(classification)
      const event = {
        classificationId,
        streamId: stream,
        classifierEventStrategyId: classifierEventStrategy,
        firstDetectionId: firstDetection,
        lastDetectionId: lastDetection,
        ...otherParams
      }
      return eventsService.create(event)
    })
    .then(event => res.location(`/events/${event.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating event'))
})

/**
 * @swagger
 *
 * /events:
 *   get:
 *     summary: Get list of events
 *     description: Perform event search across streams, classifications, classifiers.
 *       The data is returned only for streams you have access to (based on your organization, project and stream roles).
 *       If you are a super user then events for all streams are returned.
 *     tags:
 *       - events
 *     parameters:
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: streams
 *         description: List of stream values
 *         in: query
 *         type: array|string
 *       - name: classifications
 *         description: List of clasification values
 *         in: query
 *         type: array|string
 *       - name: classifiers
 *         description: List of classifier values
 *         in: query
 *         type: array|string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *     responses:
 *       200:
 *         description: List of event (lite) objects
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('streams').optional().toArray()
  params.convert('classifications').optional().toArray()
  params.convert('classifiers').optional().toArray()
  params.convert('limit').optional().toInt().default(100)
  params.convert('offset').optional().toInt().default(0)

  return params.validate()
    .then(async () => {
      const { start, end, streams, classifications, classifiers, limit, offset } = convertedParams
      const eventsData = await eventsService.query(user, start, end, streams, classifications, classifiers, limit, offset)
      return res
        .header('Total-Items', eventsData.count)
        .json(eventsData.events)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting events'))
})

/**
 * @swagger
 *
 * /events/{id}:
 *   get:
 *     summary: Get event
 *     description: Get an event and it's classification, classifier and strategy
 *     tags:
 *       - events
 *     parameters:
 *       - name: id
 *         description: Event identifier (22-character uuid slug)
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Event not found
 */
router.get('/:id', (req, res) => {
  res.status(504).send('Not implemented')
})

module.exports = router
