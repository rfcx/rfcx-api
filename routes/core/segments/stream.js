const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const masterSegmentService = require('../../../services/streams-timescale/master-segment')
const segmentService = require('../../../services/streams-timescale/segment')
const Converter = require("../../../utils/converter/converter")
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

module.exports = router
