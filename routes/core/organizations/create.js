const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const organizationsService = require('../../../services/organizations')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /organizations:
 *   post:
 *     summary: Create a organization
 *     tags:
 *       - organizations
 *     requestBody:
 *       description: Organization object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Organization'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Organization'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/organizations/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
module.exports = function (req, res) {
  const createdById = req.rfcx.auth_token_info.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('name').toString()
  converter.convert('is_public').default(false).toBoolean()

  return converter.validate()
    .then((params) => {
      const organization = {
        ...params,
        createdById
      }
      return organizationsService.create(organization)
    })
    .then(organization => res.location(`/organizations/${organization.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating organization'))
}