const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const organizationsService = require('../../../services/organizations')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /organizations/{id}:
 *   patch:
 *     summary: Update a organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: Organization identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Organization attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/OrganizationPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/OrganizationPatch'
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Organization not found
 */
module.exports = (req, res) => {
  const id = req.params.id
  const converter = new Converter(req.body, {}, true)
  converter.convert('name').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  const options = { updatableBy: req.rfcx.auth_token_info.owner_id }

  return converter.validate()
    .then(params => organizationsService.update(id, params, options))
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed updating organization'))
}
