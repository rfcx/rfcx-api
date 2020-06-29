const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const segmentService = require('../../../services/streams-timescale/segment')
const Converter = require("../../../utils/converter/converter")
const { sequelize, utils } = require("../../../modelsTimescale")

/**
 * @swagger
 *
 * /segments/{id}:
 *   delete:
 *     summary: Delete a segment
 *     tags:
 *       - segments
 *     parameters:
 *       - name: id
 *         description: Segment id
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
router.delete("/:uuid", authenticatedWithRoles('systemUser'), (req, res) => {

  return segmentService.getById(req.params.uuid)
    .then(async (segment) => {
      const stream = await streamsService.getById(segment.stream_id)
      await segmentService.remove(segment)
      await streamsService.refreshStreamStartEnd(stream) // refresh start and end columns of releated stream
      res.sendStatus(204)
    })
    .catch(httpErrorHandler(req, res, 'Failed deleting segment'));
})

module.exports = router
