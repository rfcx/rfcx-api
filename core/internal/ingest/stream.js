const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamDao = require('../../streams/dao')
const streamSourceFileDao = require('../../stream-source-files/dao')
const streamSegmentDao = require('../../stream-segments/dao')
const fileFormatDao = require('../../stream-segments/dao/file-extensions')
const { sequelize } = require('../../_models')
const { hasRole } = require('../../../common/middleware/authorization/authorization')
const Converter = require('../../../common/converter')
const ArrayConverter = require('../../../common/converter/array')
const moment = require('moment')
const arbimonService = require('../../_services/arbimon')

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
  segConverter.convert('file_size').toInt().default(0)

  sequelize.transaction()
    .then((transaction) => {
      return converter.validate()
        .then(async () => {
          const sfParams = await sfConverter.validate() // validate stream_source_file attributes
          await segConverter.validate() // validate stream_segment[] attributes

          const stream = await streamDao.get(streamId, { transaction })
          // Set missing stream_source_file attributes and create a db row
          sfParams.stream_id = streamId
          streamSourceFileDao.transformMetaAttr(sfParams)
          const streamSourceFile = await streamSourceFileDao.create(sfParams, { transaction })

          // Get file format ids
          const fileExtensions = [...new Set(segConverter.transformedArray.map(segment => segment.file_extension))]
          const fileExtensionObjects = await Promise.all(fileExtensions.map(ext => fileFormatDao.findOrCreate({ value: ext }, { transaction })))

          // Set required stream_segment attributes and create a db row
          const segments = segConverter.transformedArray.map(segment => ({
            ...segment,
            stream_id: streamId,
            stream_source_file_id: streamSourceFile.id,
            file_extension_id: fileExtensionObjects.find(obj => obj.value === segment.file_extension).id
          }))
          await Promise.all(segments.map(segment => streamSegmentDao.create(segment, { transaction })))

          // Refresh stream max_sample rate, start and end if needed
          const minStart = moment.min(segConverter.transformedArray.map(s => s.start))
          const maxEnd = moment.max(segConverter.transformedArray.map(s => s.end))
          await streamDao.refreshStreamBoundVars(stream, {
            start: minStart.toDate(),
            end: maxEnd.toDate(),
            sampleRate: streamSourceFile.sample_rate
          }, { transaction })

          if (arbimonService.isEnabled) {
            await arbimonService.createRecordingsFromSegments(segments, { transaction })
          }

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
