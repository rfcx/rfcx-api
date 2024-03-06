const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const { hasRole } = require('../../../common/middleware/authorization/authorization')
const Converter = require('../../../common/converter')
const userService = require('../../../common/users')
const arbimonService = require('../../_services/arbimon')

/**
 * @swagger
 *
 * /internal/auth0/new-login:
 *   post:
 *     summary: Create a user from POST-Login auth0 webhook
 *     tags:
 *       - internal
 *     requestBody:
 *       description: User data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: John
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               guid:
 *                 type: string
 *                 example: a4be50b3-d1c4-43a7-8e1e-6e689d8b18la
 *               email:
 *                 type: string
 *                 example: john@doe.com
 *               picture:
 *                 type: string
 *                 example: https://john.doe/picture.png
 *               user_id:
 *                 type: string
 *                 description: internal Auth0 user id
 *                 example: auth0|123
 *     responses:
 *       200:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 */

router.post('/new-login', hasRole(['systemUser']), function (req, res) {
  const converter = new Converter(req.body, {})
  converter.convert('firstname').optional()
  converter.convert('lastname').optional()
  converter.convert('guid').default('')
  converter.convert('email').default('')
  converter.convert('picture').optional()
  converter.convert('user_id')
  return converter.validate()
    .then(async (params) => {
      return userService.findOrCreateUser({
        ...params,
        username: params.user_id
      }).spread(async () => {
        await arbimonService.createUser(params)
        res.sendStatus(200)
      })
    })
    .catch((err) => {
      console.error('Failed syncing user from Auth0', err)
      httpErrorHandler(req, res, 'Failed syncing user from Auth0')(err)
    })
})

module.exports = router
