const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const usersFusedService = require('../../../services/users/fused')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const rolesService = require('../../../services/roles')
const { hasStreamPermission } = require('../../../middleware/authorization/roles')

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   get:
 *     summary: Get list of users which have been granted permission to stream
 *     tags:
 *       - roles
 *     parameters:
 *     responses:
 *       200:
 *         description: List of permissions objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserLiteWithRoleAndPermissions'
 */

router.get('/:id/users', hasStreamPermission('U'), async function (req, res) {
  try {
    return res.json(await rolesService.getUsersForItem(req.params.id, 'Stream'))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting stream permission.')(e)
  }
})

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   put:
 *     summary: Add or update stream role to user
 *     tags:
 *       - roles
 *     parameters:
 *       - name: role
 *         description: Role name
 *         in: query
 *         type: string
 *         example: "Member"
 *       - name: email
 *         description: User's email to which grant role to
 *         in: query
 *         type: string
 *         example: john@doe.com
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserLiteWithRoleAndPermissions'
 */

router.put('/:id/users', hasStreamPermission('U'), function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('role').toString()
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const stream = await streamsService.getById(streamId, { joinRelations: true })
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await usersFusedService.ensureUserSynced(user)
      if (stream.created_by_id === user.id) {
        throw new ForbiddenError('You can not assign role to stream owner.')
      }
      const role = await rolesService.getByName(convertedParams.role)
      await rolesService.addRole(user.id, role.id, streamId, 'Stream')
      return res.status(201).json(await rolesService.getUserRoleForItem(streamId, user.id, 'Stream'))
    })
    .catch(httpErrorHandler(req, res, 'Failed adding stream role for user'))
})

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   delete:
 *     summary: Refuse role from user
 *     tags:
 *       - roles
 *     parameters:
 *       - name: email
 *         description: User's email from which refuse role
 *         in: query
 *         type: string
 *         example: john@doe.com
 *     responses:
 *       200:
 *         description: OK
 */

router.delete('/:id/users', hasStreamPermission('U'), function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await rolesService.removeRole(user.id, streamId, 'Stream')
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed removing stream role.'))
})

module.exports = router
