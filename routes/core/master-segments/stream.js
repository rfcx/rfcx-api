const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const masterSegmentService = require('../../../services/streams-timescale/master-segment')
const Converter = require("../../../utils/converter/converter")
const { sequelize, utils } = require("../../../modelsTimescale")

/**
 * @swagger
 *
 * /streams/{id}/master-segments:
 *   post:
 *     summary: Create a master segment
 *     tags:
 *       - master-segments
 *     requestBody:
 *       description: Master Segment object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/MasterSegment'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/MasterSegment'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MasterSegment'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/:streamId/master-segments', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {

  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)

  params.convert('filename').toString();
  params.convert('format').toString();
  params.convert('duration').toInt().minimum(1);
  params.convert('sample_count').toInt().minimum(1);
  params.convert('sample_rate').toInt().default(1).minimum(1);
  params.convert('channel_layout').optional().toString().default('mono');
  params.convert('channels_count').optional().toInt().default(1).minimum(1);
  params.convert('bit_rate').toInt().default(1).minimum(1);
  params.convert('codec').toString();
  params.convert('sha1_checksum').toString();
  params.convert('meta').optional();

  return params.validate()
    .then(async () => {
      const stream = await streamsService.getById(streamId)
      convertedParams.stream_id = streamId;
      await masterSegmentService.checkForDuplicates(streamId, convertedParams.sha1_checksum)
      if (convertedParams.meta && Object.keys(convertedParams.meta).length !== 0 && convertedParams.meta.constructor === Object) {
        convertedParams.meta = JSON.stringify(convertedParams.meta);
      }
      else {
        delete convertedParams.meta;
      }
      await masterSegmentService.findOrCreateRelationships(convertedParams)
      const masterSegment = await masterSegmentService.create(convertedParams, { joinRelations: true });
      await streamsService.refreshStreamMaxSampleRate(stream, masterSegment)
      return res.status(201).json(masterSegmentService.format(masterSegment))
    })
    .catch(httpErrorHandler(req, res, 'Failed creating master segment'))
})

module.exports = router
