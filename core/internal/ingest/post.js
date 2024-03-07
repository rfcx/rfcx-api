const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamDao = require('../../streams/dao')
const streamSourceFileDao = require('../../stream-source-files/dao')
const streamSegmentDao = require('../../stream-segments/dao')
const fileFormatDao = require('../../stream-segments/dao/file-extensions')
const { sequelize } = require('../../_models')
const { calcSegmentDirname } = require('../../stream-segments/bl/segment-file-utils')

const Converter = require('../../../common/converter')
const ArrayConverter = require('../../../common/converter/array')
const moment = require('moment')
const arbimonService = require('../../_services/arbimon')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-file-and-segments:
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/IngestionResponse'
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/stream-source-files/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */

module.exports = function (req, res) {
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
          const transformedArray = await segConverter.validate() // validate stream_segment[] attributes

          const stream = await streamDao.get(streamId, { transaction })
          // Set missing stream_source_file attributes and create a db row
          sfParams.stream_id = streamId
          streamSourceFileDao.transformMetaAttr(sfParams)
          const minStart = moment.min(transformedArray.map(s => s.start))
          const streamSourceFile = await streamSourceFileDao.create(sfParams, minStart, { transaction })

          // Get file format ids
          const fileExtensions = [...new Set(transformedArray.map(segment => segment.file_extension))]
          const fileExtensionObjects = await Promise.all(fileExtensions.map(ext => fileFormatDao.findOrCreate({ value: ext }, { transaction })))

          const existingSegments = (await streamSegmentDao.findByStreamAndStarts(streamId, transformedArray.map(s => s.start.toISOString()), {
            transaction,
            fields: ['id', 'stream_id', 'start', 'sample_count']
          })).map(s => s.toJSON())
          if (existingSegments.length) {
            await streamSegmentDao.updateByStreamAndStarts(streamId, existingSegments.map(s => s.start.toISOString()), { availability: 1 }, { transaction })
          }
          const dataToCreate = transformedArray
            .filter((s) => { return !existingSegments.map(e => e.start.toISOString()).includes(s.start.toISOString()) })
            .map((s) => {
              const fileExtensionId = fileExtensionObjects.find(obj => obj.value === s.file_extension).id
              const path = calcSegmentDirname({
                start: s.start,
                stream_id: streamId
              })
              return {
                ...s,
                path,
                stream_id: streamId,
                stream_source_file_id: streamSourceFile.id,
                file_extension_id: fileExtensionId
              }
            })
          let createdSegments = []
          if (dataToCreate.length) {
            createdSegments = (await streamSegmentDao.bulkCreate(dataToCreate, {
              transaction,
              returning: ['id', 'stream_id', 'start', 'path', 'sample_count']
            })).map(s => {
              const fileExtension = fileExtensionObjects.find(e => e.id === s.file_extension_id)
              return {
                ...s.toJSON(),
                file_extension: fileExtension.value
              }
            })
          }
          const segments = [
            ...existingSegments,
            ...createdSegments
          ].sort((a, b) => {
            return a < b
          })

          // Refresh stream max_sample rate, start and end if needed
          const maxEnd = moment.max(transformedArray.map(s => s.end))
          await streamDao.refreshStreamBoundVars(stream, {
            start: minStart.toDate(),
            end: maxEnd.toDate(),
            sampleRate: streamSourceFile.sample_rate
          }, { transaction })

          if (arbimonService.isEnabled && createdSegments.length) {
            await arbimonService.createRecordingsFromSegments(sfParams, createdSegments, { transaction })
          }

          await Promise.all(createdSegments.map(segment => streamSegmentDao.notify(segment)))
          await transaction.commit()
          return res
            .location(`/stream-source-files/${streamSourceFile.id}`)
            .status(201)
            .json({
              stream_source_file: streamSourceFile.toJSON(),
              stream_segments: segments.map(s => { return { id: s.id, start: s.start } })
            })
        })
        .catch((err) => {
          transaction.rollback()
          httpErrorHandler(req, res, 'Failed creating stream source file and segments')(err)
        })
    })
}
