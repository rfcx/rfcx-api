const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const segmentService = require('../../../services/streams/segments')
const Converter = require('../../../utils/converter/converter')
const { hasStreamPermission } = require('../../../common/middleware/authorization/roles')

/**
 * @swagger
 *
 * /internal/explorer/streams/{id}/coverage:
 *   get:
 *     summary: Get time coverate for a stream
 *     description: This endpoint is used by the Explorer "stream info" component and some other parts
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (iso8601 or epoch)
 *         in: query
 *         type: string
 *         required: true
 *       - name: end
 *         description: End timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Coverage value and list of gaps for selected time range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coverage:
 *                   type: float
 *                   description: Total length of audio data divided by total range of requested time
 *                   example: 0.006910850034554251
 *                 gaps:
 *                   type: array
 *                   description: List of objects with time ranges where gaps are in requested time
 *                   items:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: data
 *                         example: "2020-06-06T00:31:00.000Z"
 *                       end:
 *                         type: data
 *                         example: "2020-06-06T00:40:00.000Z"
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/streams/:id/coverage', hasStreamPermission('R'), function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()

  return params.validate()
    .then(async () => {
      convertedParams.streamId = streamId
      const data = await segmentService.getStreamCoverage(convertedParams)
      res.json(data)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream coverage'))
})

module.exports = router
