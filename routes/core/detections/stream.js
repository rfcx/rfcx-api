const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const detectionsService = require('../../../services/detections')
const classificationService = require('../../../services/classifications')
const classifierService = require('../../../services/classifiers')
const rolesService = require('../../../services/roles')
const Converter = require('../../../utils/converter/converter')
const ArrayConverter = require('../../../utils/converter/array-converter')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const auth0Service = require('../../../services/auth0/auth0-service')

/**
 * @swagger
 *
 * /streams/{id}/detections:
 *   get:
 *     summary: Get list of detections belonging to a stream
 *     tags:
 *       - detections
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
 *       - name: classifications
 *         description: List of clasification identifiers
 *         in: query
 *         type: array
 *       - name: min_confidence
 *         description: Return results above a minimum confidence (by default will return above minimum confidence of the classifier)
 *         in: query
 *         type: float
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Detection'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/detections', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classifications').optional().toArray()
  params.convert('min_confidence').optional().toFloat()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      const roles = auth0Service.getUserRolesFromToken(req.user)
      if (roles.includes('systemUser')) {
        return true
      }
      const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
    })
    .then(async () => {
      const { start, end, classifications, limit, offset } = convertedParams
      const minConfidence = convertedParams.min_confidence
      const result = await detectionsService.query(start, end, streamId, classifications, minConfidence, limit, offset, user)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detections'))
})

/**
 * @swagger
 *
 * /streams/{id}/detections:
 *   post:
 *     summary: Create a detection belonging to a stream
 *     tags:
 *       - detections
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: A single detection object or multiple detections (supports multiple classification values in a single request)
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Detection'
 *         application/json:
 *           schema:
 *             anyOf:
 *               - $ref: '#/components/requestBodies/Detection'
 *               - type: array
 *                 items:
 *                   - $ref: '#/components/requestBodies/Detection'
 *             example:
 *               - start: '2020-05-19T09:35:03.500Z'
 *                 end: '2020-05-19T09:35:05.500Z'
 *                 classification: obscura
 *                 classifier: 1
 *                 confidence: 0.967814
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post('/:id/detections', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const detections = Array.isArray(req.body) ? req.body : [req.body]

  const params = new ArrayConverter(detections)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('classifier').toString()
  params.convert('confidence').toFloat()

  let classificationMapping

  return params.validate()
    .then(async () => {
      const roles = auth0Service.getUserRolesFromToken(req.user)
      if (roles.includes('systemUser')) {
        return true
      }
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, streamId, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
    })
    .then(() => {
      const validatedDetections = params.transformedArray
      // Get all the distinct classification values
      const classificationValues = [...new Set(validatedDetections.map(d => d.classification))]
      return classificationService.getIds(classificationValues)
    }).then(data => {
      classificationMapping = data
      const validatedDetections = params.transformedArray
      // Get all the distinct classifier uuids
      const classifierUuids = [...new Set(validatedDetections.map(d => d.classifier))]
      return classifierService.getIdsByExternalIds(classifierUuids)
    }).then(classifierMapping => {
      const classifierIds = Object.values(classifierMapping)
      return Promise.all(classifierIds.map(id => classifierService.update(id, null, { last_executed_at: new Date() })))
        .then(() => {
          return Promise.all(classifierIds.map(id => classifierService.get(id, { joinRelations: true })))
        })
        .then((classifiers) => {
          return Promise.resolve([classifiers, classifierMapping])
        })
    }).then(([classifiers, classifierMapping]) => {
      const validatedDetections = params.transformedArray
      const detections = validatedDetections.map(detection => {
        const classificationId = classificationMapping[detection.classification]
        const classifierId = classifierMapping[detection.classifier]
        const classifier = classifiers.find(c => c.id === classifierId)
        const threshold = classifier.outputs.find(i => i.classification_id === classificationId).ignore_threshold || detectionsService.DEFAULT_IGNORE_THRESHOLD
        if (detection.confidence > threshold) {
          return {
            streamId,
            classificationId,
            classifierId,
            start: detection.start,
            end: detection.end,
            confidence: detection.confidence
          }
        }
      }).filter(i => i !== undefined)
      return detectionsService.create(detections)
    })
    .then(detections => res.sendStatus(201)) // TODO: not returning the ids of the created detections
    .catch(httpErrorHandler(req, res, 'Failed creating detections'))
})

module.exports = router
