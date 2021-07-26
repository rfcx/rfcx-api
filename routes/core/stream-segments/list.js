const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamSegmentService = require('../../../services/streams/segments')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /streams/{id}/stream-segments:
 *   get:
 *     summary: Get list of stream segments belonging to a stream
 *     tags:
 *       - stream-segments
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: End timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *     responses:
 *       200:
 *         description: List of stream segments objects
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StreamSegment'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
module.exports = function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      convertedParams.stream_id = streamId
      return streamSegmentService.query(convertedParams, { joinRelations: true })
    })
    .then((data) => {
      res
        .header('Total-Items', data.count)
        .json(streamSegmentService.format(data.streamSegments))
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream segments'))
}
