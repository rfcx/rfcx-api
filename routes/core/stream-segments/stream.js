const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const streamSourceFileService = require('../../../services/streams-timescale/stream-source-file')
const streamSegmentService = require('../../../services/streams-timescale/stream-segment')
const Converter = require('../../../utils/converter/converter')
const { hasPermission } = require('../../../middleware/authorization/streams')

/**
 * @swagger
 *
 * /streams/{id}/stream-segments:
 *   post:
 *     summary: Create a stream segment
 *     tags:
 *       - stream-segments
 *     requestBody:
 *       description: StreamSegment object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamSegment'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamSegment'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamSegment'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/:streamId/stream-segments', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)

  params.convert('id').optional().toString()
  params.convert('stream_source_file_id').toString()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('sample_count').toInt().minimum(1)
  params.convert('file_extension').toString()

  return params.validate()
    .then(async () => {
      const stream = await streamsService.getById(streamId)
      await streamSourceFileService.getById(convertedParams.stream_source_file_id) // we call this function to ensure that source file with given id exists
      convertedParams.stream_id = streamId
      await streamSegmentService.findOrCreateRelationships(convertedParams)
      const streamSegment = await streamSegmentService.create(convertedParams, { joinRelations: true })
      await streamsService.refreshStreamStartEnd(stream) // refresh start and end columns of releated stream
      await streamSegment.reload() // reload segment model to apply stream model updates
      return res.status(201).json(streamSegmentService.format(streamSegment))
    })
    .catch(httpErrorHandler(req, res, 'Failed creating stream segment'))
})

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
router.get('/:streamId/stream-segments', hasPermission('R'), function (req, res) {
  const streamId = req.params.streamId
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
})

module.exports = router
