const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const Converter = require("../../../utils/converter/converter")

/**
 * @swagger
 *
 * /v2/streams/{id}/annotations:
 *   get:
 *     description: Get list of annotations belonging to a stream
 *     produces:
 *       - application/json
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
 *       - name: classifications
 *         description: List of clasification identifiers
 *         in: query
 *         type: array|int
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
 *         description: List of annotation (lite) objects
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get("/:streamId/annotations", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classifications').optional().toIntArray()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(() => {
      return streamsService.getStreamByGuid(streamId)
    })
    .then((stream) => {
      streamsService.checkUserAccessToStream(req, stream)
      const { start, end, classifications, limit, offset } = convertedParams
      return annotationsService.get(start, end, streamId, classifications, limit, offset)
    })
    .then((annotations) => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

module.exports = router
