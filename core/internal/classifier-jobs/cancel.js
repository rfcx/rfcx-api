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
 *     responses:
 *       200:
 *         description: List of cancel needed jobs
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

  return converter.validate()
    .then(async params => {
      const { limit } = params
      const filters = { status: AWAITING_CANCELLATION }
      const options = { limit, sort: 'updated_at' }
      const jobs = await query(filters, options)
      return res.json(jobs)
    })
    .catch(httpErrorHandler(req, res, 'Failed cancel classifier jobs'))
}
