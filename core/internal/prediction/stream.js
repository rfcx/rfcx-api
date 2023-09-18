const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const classifierProcessedSegmentsService = require('./bl/processed-segments')
const ArrayConverter = require('../../../common/converter/array')

/**
 * @swagger
 *
 * /internal/prediction/streams/segments/processed:
 *   post:
 *     summary: Saves segments processed by a classifier
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Classifier Processed Stream Segment object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/requestBodies/ClassifierProcessedSegment'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 */
router.post('/streams/segments/processed', function (req, res) {
  const user = req.rfcx.auth_token_info
  const converter = new ArrayConverter(req.body, true)
  const creatableBy = user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id
  converter.convert('stream').toString()
  converter.convert('start').toMomentUtc()
  converter.convert('classifier').toInt()
  converter.convert('classifier_job').optional().toInt()

  converter.validate()
    .then(async (params) => {
      await classifierProcessedSegmentsService.batchCreate(params, creatableBy)
      res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating classifier processed segments'))
})

module.exports = router
