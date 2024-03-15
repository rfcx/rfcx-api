const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSummary } = require('./bl/summary')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs/{id}/summary:
 *   get:
 *     summary: Get classifier job's summary
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: id
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         type: string
 *       - name: limit
 *         description: Maximum number of classifier summary results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of classifier summary results to skip
 *         in: query
 *         type: int
 *         default: 0
 *       - name: sort
 *         description: Sort the classifier summary results
 *         in: query
 *         type: string
 *         example: name
 *       - name: order
 *         description: Order the classifier summary results
 *         in: query
 *         type: string
 *         example: asc
 *       - name: keyword
 *         description: Match classification names contain with keyword
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Classifier jobs summary object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassifierJobSummary'
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Classifier job not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const convertedParams = {}
  const converter = new Converter(req.query, convertedParams, true)
  converter.convert('limit').optional().default(25).toInt()
  converter.convert('offset').optional().default(0).toInt()
  converter.convert('sort').optional().toString().toLowerCase().isEqualToAny(['name', 'unvalidated', 'confirmed', 'rejected', 'uncertain'])
  converter.convert('order').optional().toString().toLowerCase().isEqualToAny(['asc', 'desc'])
  converter.convert('keyword').optional().toString()
  return converter.validate()
    .then(async (params) => {
      const { limit, offset, sort, order, keyword } = params
      const options = { readableBy, limit, offset, sort, order }
      const filters = { keyword }
      const result = await getSummary(req.params.id, filters, options)
      return res.header('Total-Items', result.total).json(result.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting classificatier job summary'))
}
