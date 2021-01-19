const router = require('express').Router()
const detectionsService = require('../../../services/detections')
const detectionReviewService = require('../../../services/detections/review')
const rolesService = require('../../../services/roles')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const Converter = require('../../../utils/converter/converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')

/**
 * @swagger
 *
 * /detections:
 *   get:
 *     summary: Get list of detections (not yet implemented)
 *     description:
 *     tags:
 *       - detections
 *     responses:
 *       200:
 *         description: List of detection (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', (req, res) => {
  res.sendStatus(504)
})

/**
 * @swagger
 *
 * /detections/{id}/review:
 *   put:
 *     summary: Add detection review
 *     tags:
 *       - detection-reviews
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               positive:
 *                 type: boolean
 *                 description: Accept or reject detection
 *                 example: true
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               positive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Created
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Detection not found
 */

router.put('/:id/review', function (req, res) {
  const detectionId = req.params.id
  const user = req.rfcx.auth_token_info
  const userId = user.owner_id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('positive').optional().toBoolean()

  return params.validate()
    .then(async () => {
      const detection = await detectionsService.get(detectionId)
      if (!detection) {
        throw new EmptyResultError('Detection with given id not found.')
      }
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, detection.stream_id, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      await detectionReviewService.create(detectionId, userId, convertedParams.positive)
      res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating detection review'))
})

module.exports = router
