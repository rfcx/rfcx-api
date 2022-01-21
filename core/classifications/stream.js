const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const classificationsService = require('../_services/classifications')
const Converter = require('../../utils/converter/converter')
const { hasStreamPermission } = require('../../common/middleware/authorization/roles')

/**
 * @swagger
 *
 * /streams/{id}/classifications:
 *   get:
 *     summary: Get list of classifications that have been annotated on a stream
 *     tags:
 *       - classfications
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
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
 *         description: List of classification objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassificationLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */

router.get('/:id/classifications', hasStreamPermission('R'), function (req, res) {
  const streamId = req.params.id
  const convertedParams = {}
  const params = new Converter(req.query, convertedParams)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()
  return params.validate()
    .then(async () => {
      const { limit, offset } = convertedParams
      const classifications = await classificationsService.queryByStream(streamId, limit, offset)
      return res.json(classifications)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream classifications'))
})

module.exports = router
