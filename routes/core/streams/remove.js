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
  const streamId = req.params.id
  return streamsService.get(streamId)
    .then(async (stream) => {
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const idToken = req.headers.authorization
          await arbimonService.deleteSite(streamId, idToken)
        } catch (err) {
          console.error('Failed deleting site in Arbimon', err)
        }
      }
      await streamsService.remove(stream)
      return res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed deleting stream'))
}
