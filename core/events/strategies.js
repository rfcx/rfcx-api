const router = require('express').Router()
const { authenticatedWithRoles } = require('../../common/middleware/authorization/authorization')
const { httpErrorHandler } = require('../../common/error-handling/http.js')
const Converter = require('../../common/converter')
const strategiesService = require('../_services/events/strategies')

/**
 * @swagger
 *
 * /event-strategies:
 *   get:
 *     summary: Get list of event strategies
 *     tags:
 *       - events
 *     parameters:
 *       - name: function_name
 *         description: Filter the results for a specific function name
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
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
 *         description: List of event strategy objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EventStrategy'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const converter = new Converter(req.query, {}, true)
  converter.convert('function_name').optional()
  converter.convert('limit').optional().toInt().default(100)
  converter.convert('offset').optional().toInt().default(0)
  converter.convert('fields').optional().toArray()

  converter.validate().then(async (params) => {
    const { functionName, limit, offset, fields } = params
    const filters = { functionName }
    const options = { fields, limit, offset }

    const results = await strategiesService.query(filters, options)
    res.json(results)
  }).catch(httpErrorHandler(req, res, 'Failed getting event strategies'))
})

/**
 * @swagger
 *
 * /event-strategies/{id}:
 *   get:
 *     summary: Get an event strategy
 *     parameters:
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     tags:
 *       - events
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventStrategy'
 *       404:
 *         description: Event strategy not found
*/
router.get('/:id', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const id = req.params.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()

  converter.validate().then(async (options) => {
    const result = await strategiesService.get(id, options)
    res.json(result)
  }).catch(httpErrorHandler(req, res, 'Failed getting event strategy'))
})

module.exports = router
