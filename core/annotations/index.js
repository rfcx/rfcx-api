const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const { EmptyResultError } = require('../../common/error-handling/errors')
const { ValidationError } = require('../../common/error-handling/errors')
const { ForbiddenError } = require('../../common/error-handling/errors')
const rolesService = require('../roles/dao')
const dao = require('./dao')
const classificationService = require('../classifications/dao')
const Converter = require('../../common/converter')

function isUuid (str) {
  return str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/g) !== null
}

/**
 * @swagger
 *
 * /annotations:
 *   get:
 *     summary: Get list of annotations
 *     description: Perform annotation search across streams and classifications
 *     tags:
 *       - annotations
 *     parameters:
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
 *       - name: classifications
 *         description: List of clasification values
 *         in: query
 *         type: array|string
 *       - name: stream_id
 *         description: Limit results to a selected stream
 *         in: query
 *         type: string
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
 */
router.get('/', (req, res) => {
  const user = req.rfcx.auth_token_info
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('stream_id').optional().toString()
  params.convert('classifications').optional().toArray()
  params.convert('is_manual').optional().toBoolean()
  params.convert('is_positive').optional().toBoolean()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  return params.validate()
    .then(async () => {
      const streamId = convertedParams.stream_id
      const isManual = convertedParams.is_manual
      const isPositive = convertedParams.is_positive
      if (streamId) {
        const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
        if (!allowed) {
          throw new ForbiddenError('You do not have permission to access this stream.')
        }
      }
      const { start, end, classifications, limit, offset } = convertedParams
      return dao.query({ start, end, streamId, classifications, isManual, isPositive, user }, { limit, offset })
    })
    .then(annotations => res.json(annotations))
    .catch(httpErrorHandler(req, res, 'Failed getting annotations'))
})

/**
 * @swagger
 *
 * /annotations/{id}:
 *   get:
 *     summary: Get an annotation
 *     tags:
 *       - annotations
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Annotation'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Annotation not found
 */
router.get('/:id', async (req, res) => {
  try {
    const user = req.rfcx.auth_token_info
    const annotationId = req.params.id

    if (!isUuid(annotationId)) {
      throw new EmptyResultError()
    }

    const annotation = await dao.get(annotationId)
    const allowed = await rolesService.hasPermission(rolesService.READ, user, annotation.stream_id, rolesService.STREAM)

    if (!allowed) {
      throw new ForbiddenError('You do not have permission to access this stream.')
    }

    res.json(annotation)
  } catch (err) {
    httpErrorHandler(req, res, 'Failed updating annotation')
  }
})

/**
 * @swagger
 *
 * /annotations/{id}:
 *   put:
 *     summary: Update an annotation
 *     tags:
 *       - annotations
 *     parameters:
 *       - name: is
 *         description: Annotation identifer
 *         in: path
 *         required: true
 *         type: integer
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
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Annotation not found
 */
router.put('/:id', (req, res) => {
  const annotationId = req.params.id
  const user = req.rfcx.auth_token_info
  const userId = user.id
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('classification').toString()
  params.convert('frequency_min').toInt()
  params.convert('frequency_max').toInt()

  if (!isUuid(annotationId)) {
    return httpErrorHandler(req, res)(new EmptyResultError('Annotation not found'))
  }

  return params.validate()
    .then(() => dao.get(annotationId))
    .then(async annotation => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, annotation.stream_id, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission for this operation.')
      }
      return classificationService.getId(convertedParams.classification)
        .catch(_ => {
          throw new ValidationError('Classification value not found')
        })
    })
    .then(classificationId => {
      const { start, end, frequency_min, frequency_max } = convertedParams // eslint-disable-line camelcase
      return dao.update(annotationId, start, end, classificationId, frequency_min, frequency_max, userId)
    })
    .then(annotation => res.json(annotation)) // TODO: the annotation is not any of our valid schemas
    .catch(httpErrorHandler(req, res, 'Failed updating annotation'))
})

/**
 * @swagger
 *
 * /annotations/{id}:
 *   delete:
 *     summary: Delete an annotation
 *     tags:
 *       - annotations
 *     parameters:
 *       - name: is
 *         description: Annotation identifer
 *         in: path
 *         required: true
 *         type: integer
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Annotation not found
 */
router.delete('/:id', (req, res) => {
  const user = req.rfcx.auth_token_info
  const annotationId = req.params.id
  if (!isUuid(annotationId)) {
    return httpErrorHandler(req, res)(new EmptyResultError('Annotation not found'))
  }

  return dao.get(annotationId)
    .then(async (annotation) => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      const allowed = await rolesService.hasPermission(rolesService.UPDATE, user, annotation.stream_id, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission for this operation.')
      }
      return dao.remove(annotationId)
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting annotation'))
})

module.exports = router
