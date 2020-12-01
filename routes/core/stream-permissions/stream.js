const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const streamPermissionService = require('../../../services/streams/permission')
const usersFusedService = require('../../../services/users/fused')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const { hasPermission } = require('../../../middleware/authorization/streams')

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   get:
 *     summary: Get list of users which have been granted permission to stream
 *     tags:
 *       - stream-permissions
 *     parameters:
 *     responses:
 *       200:
 *         description: List of permissions objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
 */

router.get('/:streamId/users', hasPermission('W'), async function (req, res) {
  try {
    const streamId = req.params.streamId
    const permissions = await streamPermissionService.query({ stream_id: streamId }, { joinRelations: true })
    return res.json(streamPermissionService.formatMultiple(permissions))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting stream permission.')(e)
  }
})

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   put:
 *     summary: Add or update stream permission
 *     tags:
 *       - stream-permissions
 *     parameters:
 *       - name: type
 *         description: Permission type ("R" (read) or "W" (write))
 *         in: query
 *         type: string
 *         example: "R"
 *       - name: email
 *         description: User's email to which grant permission to
 *         in: query
 *         type: string
 *         example: john@doe.com
 *     responses:
 *       201:
 *         description: Created
 */

router.put('/:streamId/users', function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('type').toString().isEqualToAny(['R', 'W'])
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const stream = await streamsService.getById(streamId, { joinRelations: true })
      const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, stream, 'W')
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await usersFusedService.ensureUserSynced(user)
      if (stream.created_by_id === user.id) {
        throw new ForbiddenError('You can not assign permission to stream owner.')
      }
      await streamPermissionService.add(streamId, user.id, convertedParams.type)
      const permissions = await streamPermissionService.query({ stream_id: streamId, user_id: user.id, type: convertedParams.type }, { joinRelations: true })
      return res.status(201).json(streamPermissionService.format(permissions[0]))
    })
    .catch(httpErrorHandler(req, res, 'Failed updating stream permission'))
})

/**
 * @swagger
 *
 * /streams/{id}/users:
 *   delete:
 *     summary: Refuse permisson from user
 *     tags:
 *       - stream-permissions
 *     parameters:
 *       - name: email
 *         description: User's email from which refuse permission
 *         in: query
 *         type: string
 *         example: john@doe.com
 *     responses:
 *       200:
 *         description: OK
 */

router.delete('/:streamId/users', hasPermission('W'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await streamPermissionService.remove(streamId, user.id)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed removing stream permission.'))
})

module.exports = router
