const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const Converter = require("../../../utils/converter/converter")
const EmptyResultError = require('../../../utils/converter/empty-result-error');

/**
 * @swagger
 *
 * /v2/annotations:
 *   get:
 *     summary: Get list of annotations (not implemented)
 *     description: Perform annotation search across streams and classifications
 *     tags:
 *       - annotations
 *     parameters:
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
 *         type: array|int
 *       - name: stream
 *         description:
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

  // return params.validate()
  //   .then(() => {
  //     const { start, end, stream, classifications, limit, offset } = convertedParams
  //     return annotationsService.query(start, end, stream, classifications, limit, offset)
  //   })
  //   .then((annotations) => res.json(annotations))
  //   .catch(httpErrorHandler(req, res, 'Failed getting annotations'))

  return res.sendStatus(501)
})


/**
 * @swagger
 *
 * /v2/annotations/{id}:
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
  const userId = req.rfcx.auth_token_info.guid
  const convertedParams = {}
  const params = new Converter(req.body, convertedParams)
  params.convert('start').toMoment()
  params.convert('end').toMoment()
  params.convert('classification').toInt()
  params.convert('frequencyMin').toInt()
  params.convert('frequencyMax').toInt()

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
      const { start, end, classification, frequencyMin, frequencyMax } = convertedParams
      return annotationsService.update(annotationId, start, end, classification, frequencyMin, frequencyMax, userId)
    })
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed updating annotation'))
})

/**
 * @swagger
 *
 * /v2/annotations/{id}:
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
