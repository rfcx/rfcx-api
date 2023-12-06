const { httpErrorHandler } = require('../../common/error-handling/http')
const Converter = require('../../common/converter')
const { updateInCoreAndAuth0 } = require('./bl/update')

/**
 * @swagger
 *
 * /users/{email}:
 *   patch:
 *     summary: Update a user in database and Auth0
 *     tags:
 *       - users
 *     requestBody:
 *       description: User object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/UserUpdate'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
module.exports = function (req, res, next) {
  const converter = new Converter(req.body, {}, true)
  const user = req.rfcx.auth_token_info
  const updatableByEmail = user.email
  const auth0Sub = user.sub
  const options = { updatableByEmail, auth0Sub }
  const email = req.params.email
  converter.convert('firstname').optional().toString()
  converter.convert('lastname').optional().toString()
  converter.convert('picture').optional().toString()

  converter.validate().then(async (params) => {
    await updateInCoreAndAuth0(email, params, options)
    res.sendStatus(200)
  }).catch(httpErrorHandler(req, res, 'Failed updating user'))
}
