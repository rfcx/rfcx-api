const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /streams/{id}:
 *   get:
 *     summary: Get a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stream'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
module.exports = (req, res) => {
  const id = req.params.id
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: user.is_super || user.has_system_role ? undefined : user.id,
        fields: params.fields
      }
      return streamsService.get(id, options)
    })
    .then(stream => res.json(stream))
    .catch(httpErrorHandler(req, res, 'Failed getting stream'))
}
