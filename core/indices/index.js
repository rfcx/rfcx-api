const router = require('express').Router()
const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const indicesService = require('../_services/indices')
const Converter = require('../../utils/converter/converter')

/**
 * @swagger
 *
 * /indices:
 *   get:
 *     summary: Get list of indices
 *     tags:
 *       - indices
 *     parameters:
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
 *         description: List of index objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IndexLite'
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', function (req, res) {
  const params = new Converter(req.query)
  params.convert('limit').default(100).toInt()
  params.convert('offset').default(0).toInt()

  params.validate()
    .then(transformedParams => {
      const { limit, offset } = transformedParams
      return indicesService.query(limit, offset)
    })
    .then(data => res.json(data))
    .catch(httpErrorHandler(req, res, 'Failed searching for classifications'))
})

module.exports = router
