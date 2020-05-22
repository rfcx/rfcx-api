const router = require("express").Router()
const models = require("../../../models")
const { httpErrorHandler } = require("../../../utils/http-error-handler.js")
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')
const streamsService = require('../../../services/streams/streams-service')
const annotationsService = require('../../../services/annotations')
const Converter = require("../../../utils/converter/converter")

/**
 * @swagger
 *
 * /v2/annotations:
 *   get:
 *     summary: Get list of annotations
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
router.get("/", authenticatedWithRoles('rfcxUser'), function (req, res) {
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
  //     return annotationsService.get(start, end, stream, classifications, limit, offset)
  //   })
  //   .then((annotations) => res.json(annotations))
  //   .catch(httpErrorHandler(req, res, 'Failed getting annotations'))

  return res.sendStatus(501)
})

module.exports = router