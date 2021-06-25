const express = require('express')
const router = express.Router()
const passport = require('passport')
const eventsServiceTimescale = require('../../../services/legacy/events/events-service-timescaledb')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')

/**
 * @swagger
 *
 * /v2/events:
 *   get:
 *     summary: Get list of events
 *     tags:
 *       - legacy
 *     parameters:
 *       - name: guardian_groups
 *         description: List of legacy guardian groups ids
 *         in: query
 *         type: array|string
 *       - name: values
 *         description: List of clasification values
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
 *       - name: dir
 *         description: Results ordering
 *         in: query
 *         type: string
 *         default: DESC
 *       - name: dir
 *         description: Results ordering by datetime
 *         in: query
 *         type: string
 *         default: DESC
 *     responses:
 *       200:
 *         description: List of legacy event objects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLegacy'
 *       400:
 *         description: Invalid query parameters
 */
router.route('/').get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), (req, res) => {
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('values').optional().toArray()
  converter.convert('guardian_groups').optional().toArray()
  converter.convert('dir').default('DESC').toString()
  converter.convert('limit').toInt().default(100).maximum(1000)
  converter.convert('offset').toInt().default(0)

  return converter.validate()
    .then(params => {
      return eventsServiceTimescale.query(params, user)
    })
    .then(function (json) {
      res.status(200).send(json)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting events'))
})

/**
 * @swagger
 *
 * /v2/events/{guid}:
 *   get:
 *     summary: Get event details
 *     tags:
 *       - legacy
 *     parameters:
 *     responses:
 *       200:
 *         description: Legacy event data with windows
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventLegacyWithWindows'
 *       400:
 *         description: Invalid query parameters
 */
router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    eventsServiceTimescale.get(req.params.guid)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(httpErrorHandler(req, res, 'Failed getting event'))
  })

/**
 * @swagger
 *
 * /v2/events/{guid}/review:
 *   post:
 *     summary: Does nothing [deprecated] - was reviewing events in Neo4j database previosly
 *     tags:
 *       - legacy
 *     responses:
 *       200:
 *         description: Success result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.route('/:guid/review')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), function (req, res) {
    res.status(200).send({ success: true })
  })

module.exports = router
