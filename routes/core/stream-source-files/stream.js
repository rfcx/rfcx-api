const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const streamSourceFileService = require('../../../services/streams/source-files')
const { hasRole } = require('../../../middleware/authorization/authorization')
const Converter = require('../../../utils/converter/converter')
const { hasStreamPermission } = require('../../../middleware/authorization/roles')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-files:
 *   post:
 *     summary: Create a stream source file
 *     tags:
 *       - stream-source-files
 *     requestBody:
 *       description: Stream source file object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamSourceFile'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/StreamSourceFile'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamSourceFile'
 *       400:
 *         description: Invalid query parameters
 */

router.post('/:streamId/stream-source-files', hasRole(['systemUser']), function (req, res) {
  const streamId = req.params.streamId
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)

  params.convert('filename').toString()
  params.convert('audio_file_format').toString()
  params.convert('duration').toInt().minimum(1)
  params.convert('sample_count').toInt().minimum(1)
  params.convert('sample_rate').toInt().default(1).minimum(1)
  params.convert('channels_count').optional().toInt().default(1).minimum(1)
  params.convert('bit_rate').toInt().default(1).minimum(1)
  params.convert('audio_codec').toString()
  params.convert('sha1_checksum').toString()
  params.convert('meta').optional()

  return params.validate()
    .then(async () => {
      const stream = await streamsService.get(streamId)
      convertedParams.stream_id = streamId
      await streamSourceFileService.checkForDuplicates(streamId, convertedParams.sha1_checksum, convertedParams.filename)
      if (convertedParams.meta && Object.keys(convertedParams.meta).length !== 0 && convertedParams.meta.constructor === Object) {
        convertedParams.meta = JSON.stringify(convertedParams.meta)
      } else {
        delete convertedParams.meta
      }
      await streamSourceFileService.findOrCreateRelationships(convertedParams)
      const streamSourceFile = await streamSourceFileService.create(convertedParams, { joinRelations: true })
      await streamsService.refreshStreamMaxSampleRate(stream, streamSourceFile)
      return res.status(201).json(streamSourceFileService.format(streamSourceFile))
    })
    .catch(httpErrorHandler(req, res, 'Failed creating stream source file'))
})

/**
 * @swagger
 *
 * /streams/{id}/stream-source-files:
 *   get:
 *     summary: Get list of stream source files belonging to a stream
 *     tags:
 *       - stream-source-files
 *     parameters:
 *       - name: filename
 *         description: List of filenames
 *         in: query
 *         type: array|string
 *       - name: sha1_checksum
 *         description: List of sha1 checksums
 *         in: query
 *         type: array|string
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
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of stream source files (lite) objects
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
 *                 $ref: '#/components/schemas/StreamSourceFileLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/stream-source-files', hasStreamPermission('R'), function (req, res) {
  const converter = new Converter(req.query, {}, true)
  converter.convert('filename').optional().toArray()
  converter.convert('sha1_checksum').optional().toArray()
  converter.convert('limit').optional().toInt().default(100)
  converter.convert('offset').optional().toInt().default(0)
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(params => {
      const filters = {
        filenames: params.filename,
        streamIds: [req.params.id],
        sha1Checksums: params.sha1Checksum
      }
      const options = {
        limit: params.limit,
        offset: params.offset,
        fields: params.fields
      }
      return streamSourceFileService.query(filters, options)
    })
    .then(data => {
      res.header('Total-Items', data.total).json(data.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream source files'))
})

module.exports = router
