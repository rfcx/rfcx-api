const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const projectsService = require('../../../services/projects')
const usersFusedService = require('../../../services/users/fused')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const rolesService = require('../../../services/roles')
const { hasProjectPermission } = require('../../../middleware/authorization/roles')
const { authenticate } = require('../../../middleware/authorization/authorization')

/**
 * @swagger
 *
 * /projects/{id}/users:
 *   get:
 *     summary: Get list of users which have been granted permission to project
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

router.get('/:id/users', authenticate(), hasProjectPermission('U'), async function (req, res) {
  try {
    return res.json(await rolesService.getUsersForItem(req.params.id, rolesService.PROJECT))
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

router.put('/:id/users', authenticate(), hasProjectPermission('U'), function (req, res) {
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('role').toString()
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const project = await projectsService.get(projectId)
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await usersFusedService.ensureUserSynced(user)
      if (project.created_by_id === user.id) {
        throw new ForbiddenError('You can not assign role to project owner.')
      }
      const role = await rolesService.getByName(convertedParams.role)
      await rolesService.addRole(user.id, role.id, projectId, rolesService.PROJECT)
      return res.status(201).json(await rolesService.getUserRoleForItem(projectId, user.id, rolesService.PROJECT))
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

router.delete('/:id/users', authenticate(), hasProjectPermission('U'), function (req, res) {
  const projectId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('email').toString()

  return params.validate()
    .then(async () => {
      const user = await usersFusedService.getByEmail(convertedParams.email)
      await rolesService.removeRole(user.id, projectId, rolesService.PROJECT)
      return res.sendStatus(200)
    })
    .catch(httpErrorHandler(req, res, 'Failed removing project role.'))
})

module.exports = router
