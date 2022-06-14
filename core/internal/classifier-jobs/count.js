const { httpErrorHandler } = require('../../../common/error-handling/http')
const { count } = require('./bl')
const Converter = require('../../../common/converter')

/**
 * @swagger
 *
 * /internal/classifier-jobs/count:
 *   get:
 *     summary: Get total number of jobs across all projects and all users
 *     tags:
 *       - classifier-jobs
 *     responses:
 *       200:
 *         description: Count of jobs across all projects and all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *       403:
 *         description: Insufficient privileges
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('status').optional().toInt().default(0)

  return converter.validate()
    .then(async params => {
      const { status } = params
      const result = await count(status)
      return res.json({ total: result })
    })
    .catch(httpErrorHandler(req, res, 'Failed getting total number of classifier jobs'))
}
