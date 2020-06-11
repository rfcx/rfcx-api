const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const ValidationError = require("../../../utils/converter/validation-error")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const classificationService = require('../../../services/classification/classification-service')
const Converter = require("../../../utils/converter/converter")

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
 *       - name: stream
 *         description: Limit results to a selected stream
 *         in: query
 *         type: string
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
router.get("/", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('start').toMomentUtc()
  params.convert('end').toMomentUtc()
  params.convert('stream').optional().toString()
  params.convert('classifications').optional().toArray()
  params.convert('limit').optional().toInt()
  params.convert('offset').optional().toInt()

  // TODO: need to limit to only those annotations on streams visisble to the user
  return params.validate()
    .then(() => {
      const { start, end, stream, classifications, limit, offset } = convertedParams
      return annotationsService.query(start, end, stream, classifications, limit, offset)
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
router.get("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const annotationId = req.params.id
  const userId = req.rfcx.auth_token_info.owner_id

  if (!isUuid(annotationId)) {
    return res.sendStatus(404)
  }

  // TODO check stream permission
  return annotationsService.get(annotationId)
    .then(annotation => res.json(annotation))
    .catch(httpErrorHandler(req, res, 'Failed updating annotation'))
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
router.put("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const annotationId = req.params.id
  const userId = req.rfcx.auth_token_info.owner_id
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
    .then(() => annotationsService.get(annotationId))
    .then(annotation => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      return streamsService.getStreamByGuid(annotation.stream_id)
    })
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
    .then(() => {
      return classificationService.getId(convertedParams.classification)
        .catch(err => {
          throw new ValidationError('Classification value not found')
        })
    })
    .then(classificationId => {
      const { start, end, frequency_min, frequency_max } = convertedParams
      return annotationsService.update(annotationId, start, end, classificationId, frequency_min, frequency_max, userId)
    })
    .then(annotation => res.status(204).json(annotation))
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
router.delete("/:id", authenticatedWithRoles('rfcxUser'), (req, res) => {
  const annotationId = req.params.id

  if (!isUuid(annotationId)) {
    return httpErrorHandler(req, res)(new EmptyResultError('Annotation not found'))
  }

  return annotationsService.get(annotationId)
    .then(annotation => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      return streamsService.getStreamByGuid(annotation.stream_id)
    })
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
    .then(() => annotationsService.remove(annotationId))
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting annotation'))
})

module.exports = router
