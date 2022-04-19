const { httpErrorHandler } = require('../../common/error-handling/http')
const Converter = require('../../common/converter')
const createInCoreAndAuth0 = require('./bl/create-and-invite')

/**
 * @swagger
 *
 * /users:
 *   post:
 *     summary: Create a user
 *     tags:
 *       - users
 *     requestBody:
 *       description: User object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/User'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/User'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 */
module.exports = function (req, res, next) {
  const converter = new Converter(req.body, {}, true)
  converter.convert('firstname').toString()
  converter.convert('lastname').toString()
  converter.convert('email').toString()

  converter.validate().then(async (params) => {
    await createInCoreAndAuth0(params)
    res.sendStatus(201)
  }).catch(httpErrorHandler(req, res, 'Failed creating user'))
}
