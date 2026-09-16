const { httpErrorHandler } = require('../../common/error-handling/http')
const { restore } = require('./dao')

/**
 * @swagger
 *
 * /projects/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted project
 *     description: Compensation counterpart of DELETE /projects/{id} — undoes
 *       the soft delete when a later leg of the bio-api-owned delete chain
 *       fails (rfcx-local OPEN-ITEMS §330 item (6); design
 *       runbooks/DESIGN-2026-09-16-project-delete-one-path.md §3). Same
 *       permission shape as the delete itself.
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: Project id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: Success (also when the project was not deleted — the desired end state for a compensation call)
 *       403:
 *         description: Insufficient privileges
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  // Mirror remove.js exactly: supers and system-role holders bypass the
  // per-project permission pre-check, everyone else must hold DELETE on the
  // project. The DAO's `restore` enforces the same `deletableBy` contract as
  // `remove`, so the identity allowed to delete is the identity allowed to
  // un-delete — a compensation is not a privilege escalation.
  const restorableBy = user.is_super || user.has_system_role ? undefined : user.id
  const id = req.params.id
  const options = { deletableBy: restorableBy }
  return restore(id, options)
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed restoring project'))
}
