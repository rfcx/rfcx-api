const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const detectionsService = require('../../../services/detections')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const models = require('../../../modelsTimescale')
const streamPermissionService = require('../../../services/streams/permission')

/**
 * @swagger
 *
 * /clustered-detections:
 *   get:
 *     summary: Get detections as clusters based on an aggregate function
 *     description: Perform detection search across streams and classifications
 *     tags:
 *       - detections
 *     parameters:
 *       - name: interval
 *         description: Time interval for aggregate results. Supported intervals `d` (day), `h` (hour), `m` (minute), `s` (second).
 *         in: query
 *         schema:
 *           type: string
 *         default: 1d
 *         examples:
 *           hours:
 *             value: 3h
 *           minutes:
 *             value: 15m
 *           seconds:
 *             value: 90s
 *       - name: aggregate
 *         description: Aggregate function to apply. Supported functions `avg`, `count`, `min`, `max`, `sum`.
 *         in: query
 *         schema:
 *           type: string
 *         default: count
 *       - name: field
 *         description: Column or field to apply the function.
 *         schema:
 *           type: string
 *         default: id
 *       - name: start
 *         description: Limit to a start date on or after (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: end
 *         description: Limit to a start date before (iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *       - name: stream_id
 *         description: Limit results to a selected stream
 *         in: query
 *         type: string
 *       - name: streams_public
 *         description: Limit results to public streams
 *         in: query
 *         type: boolean
 *       - name: streams_created_by
 *         description: Limit results to streams created by `me` or `collaborators`
 *         in: query
 *         schema:
 *           type: string
 *           enum:
 *             - me
 *             - collaborators
 *       - name: min_confidence
 *         description: Return results above a minimum confidence (by default will return above minimum confidence of the classifier)
 *         in: query
 *         type: float
 *       - name: descending
 *         description: Order by descending time (most recent first)
 *         in: query
 *         type: boolean
 *         default: false
 *         example: true
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
 *     responses:
 *       200:
 *         description: List of cluster detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DetectionCluster'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', authenticatedWithRoles('rfcxUser'), (req, res) => {
  const userId = req.rfcx.auth_token_info.owner_id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('stream_id').optional().toString()
  params.convert('streams_public').optional().toBoolean()
  params.convert('streams_created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('interval').default('1d').toTimeInterval()
  params.convert('aggregate').default('count').toAggregateFunction()
  params.convert('field').default('id').isEqualToAny(models.Detection.attributes.full)
  params.convert('min_confidence').optional().toFloat()
  params.convert('descending').default(false).toBoolean()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  return params.validate()
    .then(async () => {
      const streamId = convertedParams.stream_id
      if (streamId) {
        const allowed = await streamPermissionService.hasPermission(userId, streamId, 'R')
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      const { start, end, interval, aggregate, field, descending, limit, offset } = convertedParams
      const minConfidence = convertedParams.min_confidence
      const streamsOnlyCreatedBy = convertedParams.streams_created_by
      const streamsOnlyPublic = convertedParams.streams_public
      return detectionsService.timeAggregatedQuery(start, end, streamId, streamsOnlyCreatedBy, streamsOnlyPublic, interval, aggregate, field, minConfidence, descending, limit, offset, userId)
    })
    .then(detections => res.json(detections))
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

module.exports = router
