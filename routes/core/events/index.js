const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')

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
  res.sendStatus(504)
})

module.exports = router
