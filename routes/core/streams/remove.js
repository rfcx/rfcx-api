const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const arbimonService = require('../../../services/arbimon')

/**
 * @swagger
 *
 * /streams/{id}:
 *   delete:
 *     summary: Delete a stream (soft-delete)
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */

module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const deletableBy = user.is_super || user.has_system_role ? undefined : user.id
  const id = req.params.id
  const options = { deletableBy }
  return streamsService.remove(id, options)
    .then(async () => {
      // TODO move - route handler should not contain business logic
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const idToken = req.headers.authorization
          return await arbimonService.deleteSite(id, idToken)
        } catch (err) {
          console.error('Failed deleting site in Arbimon', err)
        }
      }
      return undefined
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
}
