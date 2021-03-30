const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const Converter = require('../../../utils/converter/converter')
const arbimonService = require('../../../services/arbimon')

/**
 * @swagger
 *
 * /streams/{id}:
 *   patch:
 *     summary: Update a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Stream object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamPatch'
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
  const streamId = req.params.id
  const converter = new Converter(req.body, {})
  converter.convert('name').optional().toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  converter.convert('altitude').optional().toFloat()
  converter.convert('restore').optional().toBoolean()

  converter.validate()
    .then(async (params) => {
      const stream = await streamsService.get(streamId)
      if (params.restore === true) {
        await streamsService.restore(stream)
      }
      const updatedStream = await streamsService.update(stream, params, { joinRelations: true })
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const idToken = req.headers.authorization
          await arbimonService.updateSite(updatedStream.toJSON(), idToken)
        } catch (err) {
          console.error('Failed updating stream in Arbimon', err)
        }
      }
      return res.json(streamsService.formatStream(updatedStream))
    })
    .catch(httpErrorHandler(req, res, 'Failed updating stream'))
}
