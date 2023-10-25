const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { ForbiddenError } = require('../../common/error-handling/errors')
const models = require('../_models')
const rolesService = require('../roles/dao')

/**
 * @swagger
 *
 * /clustered-annotations:
 *   get:
 *     summary: Get annotations as clusters based on an aggregate function
 *     description: Perform annotation search across streams and classifications
 *     tags:
 *       - annotations
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
 *       - name: created_by
 *         description: Limit results to only those created by a user (e.g. `me` or username)
 *         in: query
 *         type: string
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
 *         description: List of cluster annotation (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AnnotationCluster'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('stream_id').optional().toString()
  params.convert('streams_public').optional().toBoolean()
  params.convert('created_by').optional().toString()
  params.convert('interval').default('1d').toTimeInterval()
  params.convert('aggregate').default('count').toAggregateFunction()
  params.convert('field').default('id').isEqualToAny(models.Annotation.attributes.full)
  params.convert('descending').default(false).toBoolean()
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  return params.validate()
    .then(async () => {
      const createdBy = convertedParams.created_by === 'me' ? user.id : undefined // TODO: handler username or guid case
      const streamId = convertedParams.stream_id
      if (streamId) {
        const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      const { start, end, interval, aggregate, field, descending, limit, offset } = convertedParams // eslint-disable-line camelcase
      const streamsOnlyPublic = convertedParams.streams_public
      const annotation = {
        start,
        end,
        streamId,
        user,
        createdBy
      }
      return dao.timeAggregatedQuery(
        annotation,
        {
          streamsOnlyPublic,
          interval,
          aggregate,
          field,
          descending,
          limit,
          offset
        })
    })
    .then(annotations => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

module.exports = router
