const router = require('express').Router()
const healthCheck = require('../_utils/db/health-check')
const packageData = require('../../package.json')

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

/**
 * @swagger
 *
 * /app-info:
 *   get:
 *     summary: Information on the API application
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
 *                 app:
 *                   type: string
 *                   description: Application version
 */
router.get('/app-info', (req, res) => {
  res.status(200).json({
    app: packageData.version
  })
})

module.exports = router
