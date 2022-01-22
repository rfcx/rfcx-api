const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http.js')
const Converter = require('../../common/converter')
const subscriptionsService = require('../_services/subscriptions')
const { hasProjectPermission } = require('../../common/middleware/authorization/roles')

/**
 * @swagger
 *
 * /projects/{id}/subscriptions:
 *   post:
 *     summary: Add project subsription to a user
 *     tags:
 *       - subscriptions
 *     parameters:
 *       - name: subscription
 *         description: Subscription id or name. Available values are "Email" or 1, "Push Notification" or 2
 *         in: query
 *         type: string
 *         example: Email or 1
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subscription'
 */

router.post('/:id/subscriptions', hasProjectPermission('R'), function (req, res) {
  const projectId = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('subscription').toString()

  return params.validate()
    .then(async () => {
      const subscriptionType = await subscriptionsService.getTypeByIdOrName(convertedParams.subscription)
      await subscriptionsService.addSubscription(userId, subscriptionType.id, projectId, 'project')
      return res.status(201).json(await subscriptionsService.query(userId, projectId, 'project'))
    })
    .catch(httpErrorHandler(req, res, 'Failed adding project subscription for user'))
})

/**
 * @swagger
 *
 * /projects/{id}/subscriptions:
 *   get:
 *     summary: Get list of project subscriptions for user
 *     tags:
 *       - subscriptions
 *     parameters:
 *     responses:
 *       200:
 *         description: List of subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subscription'
 */

router.get('/:id/subscriptions', hasProjectPermission('R'), async function (req, res) {
  try {
    return res.json(await subscriptionsService.query(req.rfcx.auth_token_info.id, req.params.id, 'project'))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting project subscriptions.')(e)
  }
})

/**
 * @swagger
 *
 * /projects/{id}/subscriptions:
 *   delete:
 *     summary: Remove subscription from user
 *     tags:
 *       - subscriptions
 *     parameters:
 *       - name: subscription
 *         description: Subscription id or name. If not set server will remove all subscriptions for given project id.
 *         in: query
 *         type: string
 *         example: Email or 1
 *     responses:
 *       200:
 *         description: OK
 */
router.delete('/:id/subscriptions', hasProjectPermission('R'), function (req, res) {
  const projectId = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('subscription').optional().toString()

  return params.validate()
    .then(async () => {
      let subscriptionType
      if (convertedParams.subscription) {
        subscriptionType = await subscriptionsService.getTypeByIdOrName(convertedParams.subscription)
      }
      await subscriptionsService.removeSubscription(userId, subscriptionType ? subscriptionType.id : null, projectId, 'project')
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed adding project subscription for user'))
})

module.exports = router
