const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const classifierProcessedSegmentsService = require('./bl/processed-segments')
const ArrayConverter = require('../../../common/converter/array')
const { hasRole } = require('../../../common/middleware/authorization/authorization')

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
router.post('/streams/segments/processed', hasRole(['systemUser']), function (req, res) {
  const converter = new ArrayConverter(req.body, true)
  converter.convert('stream').toString()
  converter.convert('start').toMomentUtc()
  converter.convert('classifier').toInt()
  converter.convert('classifier_job').optional().toInt()

  converter.validate()
    .then(async (params) => {
      await classifierProcessedSegmentsService.batchCreate(params)
      res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating classifier processed segments'))
})

module.exports = router
