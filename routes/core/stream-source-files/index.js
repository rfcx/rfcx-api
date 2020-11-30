const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { hasRole } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams')
const streamSourceFileService = require('../../../services/streams/stream-source-file')

/**
 * @swagger
 *
 * /stream-source-file/{id}:
 *   delete:
 *     summary: Delete a stream source file
 *     tags:
 *       - stream-source-files
 *     parameters:
 *       - name: id
 *         description: Stream source file id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.delete('/:uuid', hasRole(['systemUser']), (req, res) => {
  return streamSourceFileService.getById(req.params.uuid)
    .then(async (streamSourceFile) => {
      const stream = await streamsService.getById(streamSourceFile.stream_id)
      await streamSourceFileService.remove(streamSourceFile)
      return streamsService.refreshStreamMaxSampleRate(stream)
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting stream source file'))
})

module.exports = router
