const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const streamSourceFileService = require('../../../services/streams/source-files')
const streamSegmentService = require('../../../services/streams/segments')
const { sequelize } = require('../../../modelsTimescale')
const { hasRole } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')
const ArrayConverter = require('../../../utils/converter/array-converter')
const moment = require('moment')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-files-and-segments:
 *   post:
 *     summary: Create a stream source file and related segments
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Mixed content of stream source file object and stream segments
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Ingestion'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/stream-source-files/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */

router.post('/streams/:streamId/stream-source-files-and-segments', hasRole(['systemUser']), function (req, res) {
  const streamId = req.params.streamId

  const converter = new Converter(req.body, {})
  converter.convert('stream_source_file')
  converter.convert('stream_segments')

  const sfConverter = new Converter(req.body.stream_source_file, {})
  sfConverter.convert('filename').toString()
  sfConverter.convert('audio_file_format').toString()
  sfConverter.convert('duration').toInt().minimum(1)
  sfConverter.convert('sample_count').toInt().minimum(1)
  sfConverter.convert('sample_rate').toInt().default(1).minimum(1)
  sfConverter.convert('channels_count').optional().toInt().default(1).minimum(1)
  sfConverter.convert('bit_rate').toInt().default(1).minimum(1)
  sfConverter.convert('audio_codec').toString()
  sfConverter.convert('sha1_checksum').toString()
  sfConverter.convert('meta').optional()

  const segConverter = new ArrayConverter(req.body.stream_segments)
  segConverter.convert('id').optional().toString()
  segConverter.convert('start').toMomentUtc()
  segConverter.convert('end').toMomentUtc()
  segConverter.convert('sample_count').toInt().minimum(1)
  segConverter.convert('file_extension').toString()

  sequelize.transaction()
    .then((transaction) => {
      return converter.validate()
        .then(async () => {
          const sfParams = await sfConverter.validate() // validate stream_source_file attributes
          await segConverter.validate() // validate stream_segment[] attributes

          const stream = await streamsService.get(streamId)
          // Set missing stream_source_file attributes and create a db row
          sfParams.stream_id = streamId
          streamSourceFileService.transformMetaAttr(sfParams)
          const streamSourceFile = await streamSourceFileService.create(sfParams, { transaction })

          // Set missing stream_segment attributes and create a db row
          for (const segParams of segConverter.transformedArray) {
            segParams.stream_id = streamId
            segParams.stream_source_file_id = streamSourceFile.id
            await streamSegmentService.findOrCreateRelationships(segParams)
            await streamSegmentService.create(segParams, { transaction })
          }

          // Refresh stream max_sample rate, start adn end if needed
          const minStart = moment.min(segConverter.transformedArray.map(s => s.start))
          const maxEnd = moment.max(segConverter.transformedArray.map(s => s.end))
          await streamsService.refreshStreamBoundVars(stream, {
            start: minStart.toDate(),
            end: maxEnd.toDate(),
            sampleRate: streamSourceFile.sample_rate
          }, transaction)

          await transaction.commit()
          return res.location(`/stream-source-files/${streamSourceFile.id}`).sendStatus(201)
        })
        .catch((err) => {
          transaction.rollback()
          httpErrorHandler(req, res, 'Failed creating stream source file and segments')(err)
        })
    })
})

module.exports = router
