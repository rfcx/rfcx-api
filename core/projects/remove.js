const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const projectsService = require('../_services/projects')

/**
 * @swagger
 *
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project (soft-delete)
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
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const deletableBy = user.is_super || user.has_system_role ? undefined : user.id
  const id = req.params.id
  const options = { deletableBy }
  return projectsService.remove(id, options)
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting project'))
}
