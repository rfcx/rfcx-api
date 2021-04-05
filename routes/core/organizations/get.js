const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const organizationsService = require('../../../services/organizations')
const Converter = require('../../../utils/converter/converter')

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
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: req.rfcx.auth_token_info.owner_id,
        fields: params.fields
      }
      return organizationsService.get(req.params.id, options)
    })
    .then(organization => res.json(organization))
    .catch(httpErrorHandler(req, res, 'Failed getting organization'))
}
