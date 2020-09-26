const router = require('express').Router()
const Converter = require('../../../utils/converter/converter')
const guardianAuthService = require('../../../services/guardians/authentication')
const guardiansService = require('../../../services/guardians/guardians-service')

/**
 * @swagger
 *
 * /internal/rabbitmq/user_path:
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
 *               username:
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
router.post('/user_path', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('username').toString()
  params.convert('password').toString()

  return params.validate()
    .then(async () => {
      const isTokenCorrect = await guardianAuthService.isTokenCorrect(convertedParams.username, convertedParams.password)
      return res.send(isTokenCorrect ? 'allow' : 'deny')
    })
    .catch(() => res.send('deny'))
})

/**
 * @swagger
 *
 * /internal/rabbitmq/vhost_path:
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
 *               username:
 *                 type: string
 *               vhost:
 *                 type: string
 *               ip:
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
router.post('/vhost_path', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('username').toString()
  params.convert('vhost').toString()
  params.convert('ip').toString()

  return params.validate()
    .then(async () => {
      const guardian = await guardiansService.getGuardianByGuid(convertedParams.username, true)
      return res.send(guardian ? 'allow' : 'deny')
    })
    .catch(() => res.send('deny'))
})

/**
 * @swagger
 *
 * /internal/rabbitmq/resource_path:
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
 *               username:
 *                 type: string
 *               vhost:
 *                 type: string
 *               resource:
 *                 type: string
 *               name:
 *                 type: string
 *               permission:
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
router.post('/resource_path', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('username').toString()
  params.convert('vhost').toString()
  params.convert('resource').toString()
  params.convert('name').toString()
  params.convert('permission').toString()

  return params.validate()
    .then(async () => {
      const guardian = await guardiansService.getGuardianByGuid(convertedParams.username, true)
      return res.send(guardian ? 'allow' : 'deny')
    })
    .catch(() => res.send('deny'))
})

/**
 * @swagger
 *
 * /internal/rabbitmq/topic_path:
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
 *               username:
 *                 type: string
 *               vhost:
 *                 type: string
 *               resource:
 *                 type: string
 *               name:
 *                 type: string
 *               permission:
 *                 type: string
 *               routing_key:
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
router.post('/topic_path', (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('username').toString()
  params.convert('vhost').toString()
  params.convert('resource').toString()
  params.convert('name').toString()
  params.convert('permission').toString().isEqualToAny(['read', 'write'])
  params.convert('routing_key').toString()

  return params.validate()
    .then(async () => {
      let allow = true
      const username = convertedParams.username
      const guardian = await guardiansService.getGuardianByGuid(username, true)
      if (!guardian ||
          (convertedParams.permission === 'read' && convertedParams.routing_key !== `${convertedParams.username}.cmd`) ||
          (convertedParams.permission === 'write' && ![`guardians.${username}.checkins`, `guardians.${username}.pings`].includes(convertedParams.routing_key))) {
        allow = false
      }
      return res.send(allow ? 'allow' : 'deny')
    })
    .catch(() => res.send('deny'))
})

module.exports = router
