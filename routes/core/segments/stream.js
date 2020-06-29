const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const masterSegmentService = require('../../../services/streams-timescale/master-segment')
const segmentService = require('../../../services/streams-timescale/segment')
const Converter = require("../../../utils/converter/converter")
const ValidationError = require("../../../utils/converter/validation-error")
const { sequelize, utils } = require("../../../modelsTimescale")

/**
 * @swagger
 *
 * /streams/{id}/segments:
 *   post:
 *     summary: Create a segment
 *     tags:
 *       - segments
 *     requestBody:
 *       description: Segment object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Segment'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Segment'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Segment'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/:streamId/segments', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {

  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)

  params.convert('master_segment_id').toString()
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('sample_count').toInt().minimum(1)
  params.convert('file_extension').toString()

  return params.validate()
    .then(async () => {
      await streamsService.getById(streamId) // we call this function to ensure that stream with given id exists
      await masterSegmentService.getById(convertedParams.master_segment_id) // we call this function to ensure that master segment with given id exists
      convertedParams.stream_id = streamId;
      await segmentService.findOrCreateRelationships(convertedParams);
      const segment = await segmentService.create(convertedParams, { joinRelations: true });
      return res.status(201).json(segmentService.format(segment))
    })
    .catch(httpErrorHandler(req, res, 'Failed creating segment'))
})

/**
 * @swagger
 *
 * /streams/{id}/segments:
 *   get:
 *     summary: Get list of segments belonging to a stream
 *     tags:
 *       - segments
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
 *         description: List of segments objects
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
 *                 $ref: '#/components/schemas/Segment'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:streamId/segments', authenticatedWithRoles('rfcxUser'), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      const stream = await streamsService.getById(streamId)
      streamsService.checkUserAccessToStream(req, stream)
      convertedParams.stream_id = streamId
      return segmentService.query(convertedParams, { joinRelations: true })
    })
    .then((data) => {
      res
        .header('Total-Items', data.count)
        .json(segmentService.format(data.segments))
    })
    .catch(httpErrorHandler(req, res, 'Failed getting segments'))
})

module.exports = router
