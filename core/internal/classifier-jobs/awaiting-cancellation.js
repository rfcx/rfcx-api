const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const { query } = require('./bl')
const { AWAITING_CANCELLATION } = require('../../classifier-jobs/classifier-job-status')

/**
 * @swagger
 *
 * /internal/classifier-jobs/awaiting-cancellation:
 *   post:
 *     summary: Get a list of jobs which have been marked as AWAITING_CANCELLATION
 *     tags:
 *       - classifier-jobs
 *       - internal
 *     parameters:
 *       - name: limit
 *         description: Maximum number of jobs to retrieve
 *         in: query
 *         type: int
 *         default: 10
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *       - name: sort
 *         description: Order the results (comma-separated list of fields, prefix "-" for descending)
 *         in: query
 *         type: string
 *         example: created_at,updated_at
 *         default: updated_at
 *     responses:
 *       200:
 *         description: List of cancel needed jobs
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassifierJob'
 *       403:
 *         description: Insufficient privileges
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('limit').default(10).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('sort').optional().default('updated_at').toString().isSortEqualToAny(['updated_at', 'created_at'])

  return converter.validate()
    .then(async params => {
      const { limit, offset, sort } = params
      const filters = { status: AWAITING_CANCELLATION }
      const options = { limit, offset, sort }
      const jobs = await query(filters, options)
      return res.header('Total-Items', jobs.total).json(jobs.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed cancel classifier jobs'))
}
