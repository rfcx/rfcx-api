const router = require('express').Router()
const healthCheck = require('../utils/internal-rfcx/health-check')
const packageData = require('../package.json')

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
router.get('/health_check', healthCheck)

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
 *                 node:
 *                   type: string
 */
router.get('/app-info', (req, res) => {
  res.status(200).json({
    node: process.version, // TODO: potential security risk to advertise software versions
    app: packageData.version
  })
})

// TODO: find out if this is used
router.get('/', function (req, res) {
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication. Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  })
})

module.exports = router