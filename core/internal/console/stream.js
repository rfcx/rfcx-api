const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsStatisticsService = require('../../../services/streams/statistics')
const rolesService = require('../../../services/roles')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')

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
router.get('/streams/statistics/uploads', async function (req, res) {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      const streamId = convertedParams.stream_id
      if (streamId) {
        const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = user.id
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
router.get('/streams/statistics/annotations', async function (req, res) {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      const streamId = convertedParams.stream_id
      if (streamId) {
        const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = user.id
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
router.get('/streams/statistics/detections', async function (req, res) {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('is_public').optional().toBoolean()
  params.convert('created_by').optional().toString().isEqualToAny(['me', 'collaborators'])
  params.convert('stream_id').optional().toString()

  return params.validate()
    .then(async () => {
      const streamId = convertedParams.stream_id
      if (streamId) {
        const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      convertedParams.current_user_id = user.id
      const data = await streamsStatisticsService.getDetections(convertedParams)
      return res.json(data)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream detections statistics'))
})

module.exports = router
