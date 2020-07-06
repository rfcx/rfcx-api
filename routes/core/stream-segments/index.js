const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const streamSegmentService = require('../../../services/streams-timescale/stream-segment')

/**
 * @swagger
 *
 * /stream-segments/{id}:
 *   delete:
 *     summary: Delete a stream segment
 *     tags:
 *       - stream-segments
 *     parameters:
 *       - name: id
 *         description: Stram segment id
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
router.delete('/:uuid', authenticatedWithRoles('systemUser'), (req, res) => {
  return streamSegmentService.getById(req.params.uuid)
    .then(async (streamSegment) => {
      const stream = await streamsService.getById(streamSegment.stream_id)
      await streamSegmentService.remove(streamSegment)
      await streamsService.refreshStreamStartEnd(stream) // refresh start and end columns of releated stream
      res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed deleting stream segment'))
})

module.exports = router
