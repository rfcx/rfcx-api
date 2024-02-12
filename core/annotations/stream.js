/* eslint-disable camelcase */
const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const classificationService = require('../classifications/dao')
const Converter = require('../../common/converter')
const { hasStreamPermission } = require('../../common/middleware/authorization/roles')

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
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(() => {
      const { start, end, classifications, limit, offset } = convertedParams
      return dao.query({ start, end, classifications, streamId, user }, { limit, offset })
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
router.post('/:id/annotations', hasStreamPermission('U'), function (req, res) {
  const streamId = req.params.id
  const userId = req.rfcx.auth_token_info.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('frequency_min').optional().toInt()
  params.convert('frequency_max').optional().toInt()

  return params.validate()
    .then(() => classificationService.getId(convertedParams.classification))
    .then(classificationId => {
      const { start, end, frequency_min, frequency_max } = convertedParams
      const annotation = {
        streamId,
        classificationId,
        userId,
        start,
        end,
        frequencyMin: frequency_min, // eslint-disable-line camelcase
        frequencyMax: frequency_max // eslint-disable-line camelcase
      }
      return dao.create(annotation)
    })
    .then(annotation => res.status(201).json(annotation)) // TODO: the annotation is not any of our valid schemas
    .catch(httpErrorHandler(req, res, 'Failed creating annotation'))
})

module.exports = router
