const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const Converter = require('../../common/converter')
const dao = require('./dao')
const { put, remove } = require('./bl')
const { hasProjectPermission } = require('../../common/middleware/authorization/roles')

/**
 * @swagger
 *
 * /projects/{id}/users:
 *   get:
 *     summary: Get list of users which have been granted permission to project
 *     tags:
 *       - roles
 *     parameters:
 *       - name: include_roles
 *         description: Customize included roles
 *         in: query
 *         type: array
 *       - name: permissions
 *         description: Customize included permissions (a role includes ALL listed permissions)
 *         in: query
 *         type: array
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

router.get('/:id/users', hasProjectPermission('R'), function (req, res) {
  const converter = new Converter(req.query, {}, true)
  converter.convert('include_roles').optional().toArray()
  converter.convert('permissions').optional().toArray()
  return converter.validate()
    .then(async (params) => {
      const filters = {
        includeRoles: params.includeRoles,
        permissions: params.permissions
      }
      return res.json(await dao.getUsersForItem(req.params.id, dao.PROJECT, filters))
    })
    .catch(httpErrorHandler(req, res, 'Failed getting project permission.'))
})

/**
 * @swagger
 *
 * /projects/{id}/users:
 *   put:
 *     summary: Add or update project role to user
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

router.put('/:id/users', hasProjectPermission('D'), function (req, res) {
  const userId = req.rfcx.auth_token_info.id
  const isSuper = req.rfcx.auth_token_info.is_super
  const projectId = req.params.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('role').toString()
  converter.convert('email').toString()

  return converter.validate()
    .then(async (params) => {
      const result = await put(params, userId, isSuper, projectId, dao.PROJECT)
      return res.status(201).json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed adding project role for user'))
})

/**
 * @swagger
 *
 * /projects/{id}/users:
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

router.delete('/:id/users', hasProjectPermission('D'), function (req, res) {
  const userId = req.rfcx.auth_token_info.id
  const isSuper = req.rfcx.auth_token_info.is_super
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('email').toString()

  return params.validate()
    .then(async (params) => {
      await remove(params, userId, isSuper, projectId, dao.PROJECT)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed removing project role.'))
})

module.exports = router
