const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const organizationsService = require('../../../services/organizations')

/**
 * @swagger
 *
 * /organizations/{id}:
 *   delete:
 *     summary: Delete (or undelete) an organization
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: id
 *         description: Organization identifier
 *         in: path
 *         required: true
 *         type: string
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
  const options = {
    deletableBy: req.rfcx.auth_token_info.owner_id
  }
  return organizationsService.remove(id, options)
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting organization'))
}
