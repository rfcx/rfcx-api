const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams')
const streamSourceFileService = require('../../../services/streams/stream-source-file')
const Converter = require('../../../utils/converter/converter')

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

router.post('/:streamId/stream-source-files', authenticatedWithRoles('rfcxUser', 'systemUser'), function (req, res) {
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
      const stream = await streamsService.getById(streamId)
      convertedParams.stream_id = streamId
      await streamSourceFileService.checkForDuplicates(streamId, convertedParams.sha1_checksum)
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

module.exports = router
