const { httpErrorHandler } = require('../../../common/error-handling/http')
const { createResults } = require('./dao/create-results')

/**
 * @swagger
 *
 * /internal/classifier-jobs/{id}/results:
 *   post:
 *     summary: Create detections and update job progress
 *     tags:
 *       - classifier-jobs
 *       - detections
 *     parameters:
 *       - name: id
 *         description: Classifier Job identifier
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: An incremental result object containing detections & number of minutes that were processed
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ClassifierResult'
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Job not found
 */
module.exports = (req, res) => {
  // Check authorization
  if (!req.rfcx.auth_token_info.has_system_role && !req.rfcx.auth_token_info.is_super) {
    console.warn(`WARN: ${req.method} ${req.path} Forbidden`)
    return res.sendStatus(403)
  }

  const jobId = req.params.id
  return createResults(jobId, req.body)
    .then(() => res.sendStatus(200))
    .catch(httpErrorHandler(req, res, 'Failed updating classifier job'))

  // const converter = new Converter(req.body, {}, true)
  // converter.convert('status').optional().toInt().default(0)

  // return converter.validate()
  //   .then(async params => {
  //     const { status } = params
  //     const result = await count(status)
  //     return res.json({ total: result })
  //   })
  //   .catch(httpErrorHandler(req, res, 'Failed getting total number of classifier jobs'))
}
