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

  let stream;

  return params.validate()
    .then(() => {
      return streamsService.getById(streamId) // we call this function to ensure that stream with given id exists
    })
    .then((dbStream) => {
      stream = dbStream;
      convertedParams.stream_id = streamId;
      return masterSegmentService.checkForDuplicates(streamId, convertedParams.sha1_checksum)
    })
    .then(async () => {
      if (convertedParams.meta && Object.keys(convertedParams.meta).length !== 0 && convertedParams.meta.constructor === Object) {
        convertedParams.meta = JSON.stringify(convertedParams.meta);
      }
      else {
        delete convertedParams.meta;
      }
      const mappings = await masterSegmentService.findOrCreateRelationships(convertedParams);
      ['codec', 'format', 'sample_rate', 'channel_layout'].forEach((attr) => {
        convertedParams[`${attr}_id`] = mappings[attr];
      });
    })
    .then(() => {
      return masterSegmentService.create(convertedParams, { joinRelations: true });
    })
    .then(async (masterSegment) => {
      await streamsService.refreshStreamMaxSampleRate(stream, masterSegment)
      return masterSegment
    })
    .then(masterSegmentService.format)
    .then(stream => res.status(201).json(stream))
    .catch(httpErrorHandler(req, res, 'Failed creating master segment'))
})

module.exports = router
