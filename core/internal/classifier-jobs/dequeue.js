const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const { dequeue } = require('./bl')

/**
 * @swagger
 *
 * /internal/classifier-jobs/dequeue:
 *   post:
 *     summary: Remove 1 or more jobs from the front of the queue (atomically) up to the `concurrency`
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: concurrency
 *         description: Maximum number of running jobs, system-wide (dequeued + running jobs will not exceed this)
 *         in: query
 *         type: int
 *         default: 1
 *       - name: limit
 *         description: Maximum number of jobs to dequeue
 *         in: query
 *         type: int
 *         default: (use concurrency)
 *     responses:
 *       200:
 *         description: List of dequeued jobs
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
  converter.convert('concurrency').default(1).toInt()
  converter.convert('limit').optional().toInt()

  return converter.validate()
    .then(async params => {
      const { concurrency, limit } = params
      const jobs = await dequeue(concurrency, limit || concurrency)
      return res.json(jobs)
    })
    .catch(httpErrorHandler(req, res, 'Failed dequeue classifier jobs'))
}
