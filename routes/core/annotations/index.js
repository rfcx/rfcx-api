const router = require("express").Router()
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
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
 *         description: List of clasification identifiers
 *         in: query
 *         type: array|int
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
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('stream').optional().toString()
  params.convert('classifications').optional().toIntArray()
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
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classification').toInt()
  params.convert('frequency_min').toInt()
  params.convert('frequency_max').toInt()

  if (!isUuid(annotationId)) {
    return res.sendStatus(404)
  }

  return params.validate()
    .then(() => annotationsService.get(annotationId))
    .then(annotation => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      return streamsService.getStreamByGuid(annotation.streamId)
    })
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
    .then(() => {
      const { start, end, classification, frequency_min, frequency_max } = convertedParams
      return annotationsService.update(annotationId, start, end, classification, frequency_min, frequency_max, userId)
    })
    .then(() => res.sendStatus(204))
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
    return res.sendStatus(404)
  }

  return annotationsService.get(annotationId)
    .then(annotation => {
      if (!annotation) {
        throw new EmptyResultError('Annotation not found')
      }
      return streamsService.getStreamByGuid(annotation.streamId)
    })
    .then(stream => streamsService.checkUserAccessToStream(req, stream))
    .then(() => annotationsService.remove(annotationId))
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed deleting annotation'))
})

module.exports = router
