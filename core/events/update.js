const { httpErrorHandler } = require('../../common/error-handling/http')
const Converter = require('../../common/converter')
const { update } = require('./dao')

/**
 * @swagger
 *
 * /events/{id}:
 *   post:
 *     summary: Update an event
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
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Event not found
 */
module.exports = function (req, res, next) {
  const id = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super
  const hasSystemRole = req.rfcx.auth_token_info.has_system_role
  const converter = new Converter(req.body, {}, true)
  converter.convert('classifier_event_strategy').optional().toInt()
  converter.convert('end').optional().toMomentUtc()

  converter.validate().then(async (params) => {
    const options = {
      updatableBy: userIsSuper || hasSystemRole ? undefined : userId
    }
    await update(id, params, options)
    res.sendStatus(204)
  }).catch(httpErrorHandler(req, res, 'Failed creating event'))
}
