const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../common/middleware/authorization/authorization')
const Converter = require('../../utils/converter/converter')
const eventsService = require('../_services/events')

router.post('/', authenticatedWithRoles('systemUser'), require('./create'))
router.patch('/:id', authenticatedWithRoles('systemUser'), require('./update'))

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
 *       - name: descending
 *         description: Order the results in descending order (newest first)
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
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
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super
  const hasSystemRole = req.rfcx.auth_token_info.has_system_role
  const converter = new Converter(req.query, {})
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('streams').optional().toArray()
  converter.convert('classifications').optional().toArray()
  converter.convert('classifiers').optional().toArray()
  converter.convert('limit').optional().toInt().default(100)
  converter.convert('offset').optional().toInt().default(0)
  converter.convert('descending').default(false).toBoolean()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(params => {
      const filters = {
        start: params.start,
        end: params.end,
        streamIds: params.streams,
        classificationValues: params.classifications,
        classifierIds: params.classifiers
      }
      const options = {
        readableBy: userIsSuper || hasSystemRole ? undefined : userId,
        limit: params.limit,
        offset: params.offset,
        descending: params.descending,
        fields: params.fields
      }
      return eventsService.query(filters, options)
    })
    .then(data => {
      res.header('Total-Items', data.total).json(data.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting events'))
})

/**
 * @swagger
 *
 * /events/{id}:
 *   get:
 *     summary: Get event
 *     description: Get an event including it's classification, classifier and strategy
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
  const id = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super
  const hasSystemRole = req.rfcx.auth_token_info.has_system_role
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: userIsSuper || hasSystemRole ? undefined : userId,
        fields: params.fields
      }
      return eventsService.get(id, options)
    })
    .then(event => res.json(event))
    .catch(httpErrorHandler(req, res, 'Failed getting event'))
})

module.exports = router
