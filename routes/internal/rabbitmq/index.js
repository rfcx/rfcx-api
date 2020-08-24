const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const guardianAuthService = require('../../../services/guardians/authentication')

/**
 * @swagger
 *
 * /internal/rabbitmq/authenticate:
 *   post:
 *     summary: Endpoint for RabbitMQ broker authentication
 *     tags:
 *       - internal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guid:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *     responses:
 *       200:
 *         description: RabbitMQ always expects 200 status to be returned
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: allow | deny
 */
router.post('/authenticate', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('guid').toString()
  params.convert('password').toString()

  return params.validate()
    .then(async () => {
      const isTokenCorrect = await guardianAuthService.isTokenCorrect(convertedParams.guid, convertedParams.password)
      return res.send(isTokenCorrect ? 'allow' : 'deny')
    })
    .catch(() => res.send('deny'))
})

module.exports = router
