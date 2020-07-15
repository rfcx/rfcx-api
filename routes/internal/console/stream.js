const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams-timescale')
const streamsStatisticsService = require('../../../services/streams-timescale/statistics')
const streamPermissionService = require('../../../services/streams-timescale/permission')
const segmentService = require('../../../services/streams-timescale/stream-segment')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const { hasPermission } = require('../../../middleware/authorization/streams')

/**
 * @swagger
 *
 * /internal/console/streams/statistics/uploads:
 *   get:
 *     summary: Get upload statistics for user streams
 *     description: This endpoint is used by the Console "statistics" component
 *     tags:
 *       - internal
 *     parameters:
 *       - name: stream_id
 *         description: Stream ID
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Uploads statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadsStatistics'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.get('/streams/statistics/uploads', authenticatedWithRoles('rfcxUser'), async function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      if (convertedParams.stream_id) {
        const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, convertedParams.stream_id, 'R')
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = req.rfcx.auth_token_info.owner_id
      const data = await streamsStatisticsService.getUploads(convertedParams)
      return res.json(data)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream uploads statistics'))
})

/**
 * @swagger
 *
 * /internal/console/streams/statistics/annotations:
 *   get:
 *     summary: Get annotations statistics for user streams
 *     description: This endpoint is used by the Console "statistics" component
 *     tags:
 *       - internal
 *     parameters:
 *       - name: stream_id
 *         description: Stream ID
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Annotations statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnnotationsStatistics'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.get('/streams/statistics/annotations', authenticatedWithRoles('rfcxUser'), async function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      if (convertedParams.stream_id) {
        const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, convertedParams.stream_id, 'R')
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = req.rfcx.auth_token_info.owner_id
      const data = await streamsStatisticsService.getAnnotations(convertedParams)
      return res.json(data)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream annotations statistics'))
})

/**
 * @swagger
 *
 * /internal/console/streams/statistics/detections:
 *   get:
 *     summary: Get detections statistics for user streams
 *     description: This endpoint is used by the Console "statistics" component
 *     tags:
 *       - internal
 *     parameters:
 *       - name: stream_id
 *         description: Stream ID
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Detections statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionsStatistics'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream not found
 */
router.get('/streams/statistics/detections', authenticatedWithRoles('rfcxUser'), async function (req, res) {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      if (convertedParams.stream_id) {
        const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, convertedParams.stream_id, 'R')
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = req.rfcx.auth_token_info.owner_id
      const data = await streamsStatisticsService.getDetections(convertedParams)
      return res.json(data)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream detections statistics'))
})

module.exports = router
