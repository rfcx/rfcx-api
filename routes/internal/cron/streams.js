const router = require('express').Router()
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const { authenticate } = require('../../../middleware/authorization/authorization')

/**
 * @swagger
 *
 * /internal/cron/streams/clear:
 *   post:
 *     summary: (Not yet implemented) Remove streams which were marked as deleted more than 30 days ago
 *     description: This endpoint is called by cron job each day or manually by streamsAdmin
 *     tags:
 *       - internal
 *     parameters:
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 */
router.post('/streams/clear', authenticate(), authenticatedWithRoles('systemUser', 'streamsAdmin'), function (req, res) {
  // Not yet implemented
  res.sendStatus(501)
})

module.exports = router
