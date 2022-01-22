const { httpErrorHandler } = require('../../common/error-handling/http.js')
const organizationsService = require('../_services/organizations')
const Converter = require('../../utils/converter/converter')

/**
 * @swagger
 *
 * /organizations/{id}:
 *   get:
 *     summary: Get an organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: Organization identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Organization not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user.is_super || user.has_system_role ? undefined : user.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = { ...params, readableBy }
      return organizationsService.get(req.params.id, options)
    })
    .then(organization => res.json(organization))
    .catch(httpErrorHandler(req, res, 'Failed getting organization'))
}
