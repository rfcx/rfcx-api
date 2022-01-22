const { httpErrorHandler } = require('../../common/error-handling/http.js')
const dao = require('./dao')

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
  const user = req.rfcx.auth_token_info
  const deletableBy = user.is_super || user.has_system_role ? undefined : user.id
  const id = req.params.id
  const options = { deletableBy }
  return dao.remove(id, options)
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting organization'))
}
