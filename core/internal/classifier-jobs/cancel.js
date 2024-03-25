const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const { cancel } = require('./bl')

/**
 * @swagger
 *
 * /internal/classifier-jobs/cancel:
 *   post:
 *     summary: Cancel 1 or more jobs from the running jobs (automically) up to the `concurrency`
 *     tags:
 *       - classifier-jobs
 *       - internal
 *     parameters:
 *       - name: limit
 *         description: Maximum number of jobs to cancel
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
      const jobs = await cancel(limit)
      return res.json(jobs)
    })
    .catch(httpErrorHandler(req, res, 'Failed cancel classifier jobs'))
}
