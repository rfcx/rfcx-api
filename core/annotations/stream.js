const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const annotationsService = require('../../services/annotations')
const classificationService = require('../../services/classifications')
const Converter = require('../../utils/converter/converter')
const { hasStreamPermission } = require('../../middleware/authorization/roles')
const ensureUserSynced = require('../../middleware/legacy/ensure-user-synced')

/**
 * @swagger
 *
 * /streams/{id}/annotations:
 *   get:
 *     summary: Get list of annotations belonging to a stream
 *     tags:
 *       - annotations
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
 *       - name: is_manual
 *         description: Limit results to manual annotation
 *         in: query
 *         type: boolean
 *       - name: is_positive
 *         description: Limit results to a type of annotation ( true for true positive or false for false positive)
 *         in: query
 *         type: boolean
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
 *         description: List of annotation (lite) objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AnnotationLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/annotations', hasStreamPermission('R'), function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classifications').optional().toArray()
  params.convert('is_manual').optional().toBoolean()
  params.convert('is_positive').optional().toBoolean()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(() => {
      const isManual = convertedParams.is_manual
      const isPositive = convertedParams.is_positive
      const { start, end, classifications, limit, offset } = convertedParams
      return annotationsService.query({ start, end, classifications, streamId, isManual, isPositive, user }, { limit, offset })
    })
    .then((annotations) => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

/**
 * @swagger
 *
 * /streams/{id}/annotations:
 *   post:
 *     summary: Create an annotation belonging to a stream
 *     tags:
 *       - annotations
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Annotation object
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Annotation'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Annotation'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnnotationLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.post('/:id/annotations', ensureUserSynced, hasStreamPermission('U'), function (req, res) {
  const streamId = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('frequency_min').optional().toInt()
  params.convert('frequency_max').optional().toInt()
  params.convert('is_manual').toBoolean().default(true)
  params.convert('is_positive').toBoolean().default(true)

  return params.validate()
    .then(() => classificationService.getId(convertedParams.classification))
    .then(classificationId => {
      const { start, end, frequency_min, frequency_max, is_manual, is_positive } = convertedParams // eslint-disable-line camelcase
      const annotation = {
        streamId,
        classificationId,
        userId,
        start,
        end,
        frequencyMin: frequency_min,
        frequencyMax: frequency_max,
        isManual: is_manual,
        isPositive: is_positive
      }
      return annotationsService.create(annotation)
    })
    .then(annotation => res.status(201).json(annotation)) // TODO: the annotation is not any of our valid schemas
    .catch(httpErrorHandler(req, res, 'Failed creating annotation'))
})

module.exports = router
