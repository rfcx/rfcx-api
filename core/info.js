const router = require('express').Router()
const healthCheck = require('./_utils/db/health-check')

/**
 * @swagger
 *
 * /health-check:
 *   get:
 *     summary: Get a system health check
 *     tags:
 *       - unsupported
 *     security: []
 *     responses:
 *       200:
 *         description:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 healthy:
 *                   type: boolean
 */
router.get('/health-check', healthCheck)

router.get('/', function (_req, res) {
  res.redirect('https://rfcx.org')
})

module.exports = router
