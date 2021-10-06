const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { hasRole } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')
const userService = require('../../../services/users/users-service-legacy')
const usersFusedService = require('../../../services/users/fused')
const arbimonService = require('../../../services/arbimon')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-files-and-segments:
 *   post:
 *     summary: Create a stream source file and related segments
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
 *
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/stream-source-files/xyz123`)
 *             schema:
 *               type: string
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
        username: params.user_id,
        rfcx_system: false
      }).spread(async (user) => {
        await usersFusedService.ensureUserSynced(user)
        await arbimonService.createUser(params)
        res.sendStatus(200)
      })
    })
    .catch((err) => {
      httpErrorHandler(req, res, 'Failed syncing user from Auth0')(err)
    })
})

module.exports = router
