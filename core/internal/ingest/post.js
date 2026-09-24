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
const usersService = require('../../../common/users')
const { Sequelize } = require('../../_models')

/**
 * Resolve the uploader the ingest worker forwards (ingest.stream_uploads.user_id)
 * to a core user. That id is a MIXED space measured live 2026-09-22: 46 of 57
 * distinct uploaders are users.guid, 3 are `auth0|...` subs stored in
 * users.username, and 8 are bulk/service identities with no users row at all.
 * Returns { id, email } or null. FAIL-OPEN: attribution must never fail an
 * ingest, so any lookup error resolves to null (stored as NULL, never invented).
 * rfcx-local OPEN-ITEMS 375.
 */
// users.guid is a PG `uuid` column. Comparing it to a non-uuid string (the
// `auth0|...` subs above) raises 22P02 INSIDE the request transaction; the
// catch below cannot un-abort it, so every later statement 25P02s and the
// whole ingest 500s (rfcx-local FINDING-2026-09-22 ingest-500-nonuuid; live
// again 2026-09-24: 687 uploads for one auth0 user in 15 min). Only query the
// guid leg for uuid-shaped ids -- a non-uuid can never equal a uuid anyway.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveUploader (uploaderId, transaction) {
  if (typeof uploaderId !== 'string' || !uploaderId.length) { return null }
  const where = UUID_RE.test(uploaderId)
    ? { [Sequelize.Op.or]: { guid: uploaderId, username: uploaderId } }
    : { username: uploaderId }
  try {
    const user = await usersService.getUserByParams(where, true, { transaction })
    if (!user) { return null }
    return { id: user.id, email: user.email || null }
  } catch (e) {
    console.warn(`[ingest] uploader resolution failed for ${uploaderId} (storing NULL): ${e && e.message}`)
    return null
  }
}

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
  // The uploader as the ingest worker knows it (stream_uploads.user_id, TEXT).
  // Optional so older workers keep working; resolved below.
  sfConverter.convert('uploaded_by').optional().toString()

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
          // Resolve WHO uploaded this file, once per request, before the row is
          // born: the id lands on stream_source_files.uploaded_by_id here and the
          // email rides the arbimon call so recordings.uploaded_by can resolve
          // it on its own user table (email is the bridge the two share).
          const uploader = await resolveUploader(sfParams.uploaded_by, transaction)
          delete sfParams.uploaded_by
          sfParams.uploaded_by_id = uploader ? uploader.id : null
          sfParams.uploaded_by_email = uploader ? uploader.email : null
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
              // `file_size` is validated on the request but is NOT a column on
              // stream_segments, so it is absent from the bulkCreate `returning`
              // set and from s.toJSON(). Carry it across from the validated
              // payload (matched on start, which is what dedups segments above)
              // so Arbimon recordings get a real byte size -- see the comment on
              // matchSegmentToRecording(). Without this, every Arbimon recording
              // created through this endpoint is written with file_size = 0.
              //
              // Matched on `start` rather than by array index because bulkCreate
              // gives no ordering guarantee, and index matching would silently
              // attribute one segment's size to another. `ts()` is defensive on
              // purpose: carrying a byte count is a metadata nicety, so it must
              // never be able to throw and take the whole ingest endpoint --
              // and therefore every incoming upload -- down with it.
              const ts = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime())
              const target = ts(s.start)
              const source = Number.isNaN(target) ? undefined : dataToCreate.find(d => ts(d.start) === target)
              return {
                ...s.toJSON(),
                file_extension: fileExtension.value,
                file_size: source ? source.file_size : 0
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
