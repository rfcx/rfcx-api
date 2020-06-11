const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const classificationsService = require('../../../services/classification/classification-service')
const Converter = require('../../../utils/converter/converter')

/**
 * @swagger
 *
 * /internal/explorer/streams/{id}/classifications:
 *   get:
 *     summary: Get a list of classifications for a stream, together with their characteristics
 *     description: This endpoint is used by the Explorer "classification list" component
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
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
 *         description: List of classification with their characteristics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $allOf:
 *                   - $ref: '#/components/schemas/ClassificationLite'
 *                   - type: object
 *                       properties:
 *                         characteristics:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ClassificationLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get("/streams/:id/classifications", authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()
  return params.validate()
    .then(() => {
      return streamsService.getStreamByGuid(streamId)
    })
    .then(stream => {
      streamsService.checkUserAccessToStream(req, stream)
      const { limit, offset } = convertedParams
      return classificationsService.queryByStreamIncludeChildren(streamId, 'characteristic', limit, offset)
    })
    .then(classifications => res.json(classifications))
    .catch(httpErrorHandler(req, res, 'Failed getting stream classifications'))
})

module.exports = router
