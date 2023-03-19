const router = require('express').Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamSegmentDao = require('../../stream-segments/dao')
const classifierProcessedSegmentsService = require('./bl/processed-segments')
const Converter = require('../../../common/converter')
const ArrayConverter = require('../../../common/converter/array')
const { hasRole } = require('../../../common/middleware/authorization/authorization')

/**
 * @swagger
 *
 * /internal/prediction/streams/{id}/segments:
 *   get:
 *     summary: Get list of stream segments between start and end unprocessed by specified `classifier`
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: End timestamp (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: classifiers
 *         description: List of classifier ids
 *         in: query
 *         type: array|string
 *       - name: strict
 *         description: Only return segments that start within the range of the start/end parameters (better performance)
 *         in: query
 *         type: boolean
 *         default: true
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
 *         description: List of stream segments objects
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
 *                 $ref: '#/components/schemas/StreamSegment'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/streams/:id/segments', hasRole(['systemUser']), function (req, res) {
  const streamId = req.params.id
  const user = req.rfcx.auth_token_info
  const readableBy = user.is_super || user.has_system_role ? undefined : user.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('start').toMomentUtc()
  converter.convert('end').toMomentUtc()
  converter.convert('classifier').toInt()
  converter.convert('limit').optional().toInt()
  converter.convert('offset').optional().toInt()
  converter.convert('strict').default(true).toBoolean()

  converter.validate()
    .then(async (params) => {
      const { start, end, classifier, limit, offset, strict } = params
      const options = { readableBy, limit, offset, strict }
      return streamSegmentDao.query({ start, end, streamId, classifier }, options)
    })
    .then((data) => res.header('Total-Items', data.count).json(data.results))
    .catch(httpErrorHandler(req, res, 'Failed getting stream segments'))
})

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
  converter.convert('classifier_job_id').optional().toInt()

  converter.validate()
    .then(async (params) => {
      await classifierProcessedSegmentsService.batchCreate(params)
      res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating classifier processed segments'))
})

module.exports = router
