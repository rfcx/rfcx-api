const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const projectsService = require('../projects/dao')
const usersService = require('../../common/users')
const Converter = require('../../common/converter')
const { ForbiddenError } = require('../../common/error-handling/errors')
const dao = require('./dao')
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
 *         description: Customize included permissions
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

router.get('/:id/users', hasProjectPermission('R'), async function (req, res) {
  const converter = new Converter(req.query, {}, true)
  converter.convert('include_roles').optional().toArray()
  converter.convert('permissions').optional().toArray()
  try {
    const params = await converter.validate()
    const options = {
      includeRoles: params.includeRoles,
      permissions: params.permissions
    }
    return res.json(await dao.getUsersForItem(req.params.id, dao.PROJECT, options))
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting project permission.')(e)
  }
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

router.put('/:id/users', hasProjectPermission('U'), function (req, res) {
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('role').toString()
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const project = await projectsService.get(projectId)
      const user = await usersService.getUserByEmail(convertedParams.email)
      const role = await dao.getByName(convertedParams.role)
      await dao.addRole(user.id, role.id, projectId, dao.PROJECT)
      return res.status(201).json(await dao.getUserRoleForItem(projectId, user.id, dao.PROJECT))
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
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const user = await usersService.getUserByEmail(convertedParams.email)
      await dao.removeRole(user.id, projectId, dao.PROJECT)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed removing project role.'))
})

module.exports = router
