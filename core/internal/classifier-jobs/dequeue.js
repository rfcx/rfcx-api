const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')

/**
 * @swagger
 *
 * /internal/classifier-jobs/dequeue:
 *   post:
 *     summary: Remove 1 or more jobs from the front of the queue (atomically)
 *     tags:
 *       - classifier-jobs
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

  return converter.validate()
    .then(async params => {
      return res.json([])
    })
    .catch(httpErrorHandler(req, res, 'Failed dequeue classifier jobs'))
}
