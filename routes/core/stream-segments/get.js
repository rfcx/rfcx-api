const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { get } = require('../../../services/streams/segments')
const Converter = require('../../../utils/converter/converter')
const { gluedDateStrOrEpochToMoment } = require('../../../utils/misc/datetime.js')
const { Sequelize } = require('../../../modelsTimescale/index.js')

/**
 * @swagger
 *
 * /streams/{id}/segments/{start}:
 *   get:
 *     summary: Get a single stream segment
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (compact iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: strict
 *         description: Only return segments strictly within start/end (better performance)
 *         in: query
 *         type: boolean
 *         default: true
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Stream segment object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamSegment'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream or segment not found
 */
module.exports = (req, res) => {
  const streamId = req.params.id
  const start = gluedDateStrOrEpochToMoment(req.params.start)
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()
  converter.convert('strict').default(true).toBoolean()
  return converter.validate()
    .then(params => {
      const options = {
        readableBy: user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id,
        ...params
      }
      return get(streamId, start, options)
    })
    .then(segment => res.json(segment))
    .catch(httpErrorHandler(req, res, 'Failed getting stream segment'))
}
