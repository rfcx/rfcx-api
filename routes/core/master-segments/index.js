const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const masterSegmentService = require('../../../services/streams-timescale/master-segment')
const Converter = require("../../../utils/converter/converter")
const { sequelize, utils } = require("../../../modelsTimescale")
const masterSegment = require("../../../services/streams-timescale/master-segment")

/**
 * @swagger
 *
 * /master-segments/{id}:
 *   delete:
 *     summary: Delete a master segment
 *     tags:
 *       - master-segments
 *     parameters:
 *       - name: id
 *         description: Master segment id
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

  return masterSegmentService.getById(req.params.uuid)
    .then(async (masterSegment) => {
      const stream = await streamsService.getById(masterSegment.stream_id)
      await masterSegmentService.remove(masterSegment)
      return streamsService.refreshStreamMaxSampleRate(stream)
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting master segment'));
})

module.exports = router
