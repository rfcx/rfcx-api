const router = require('express').Router()
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')

/**
 * @swagger
 *
 * /event-strategies:
 *   get:
 *     summary: Get list of event strategies
 *     tags:
 *       - events
 *     parameters:
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
router.get('/', authenticatedWithRoles('appUser', 'rfcxUser'), function (req, res) {
  res.status(501).send('Not implemented')
})

module.exports = router
