const { httpErrorHandler } = require('../../common/error-handling/http')
const { getValidationStatus } = require('./bl/summary')

/**
 * @swagger
 *
 * /classifier-jobs/{id}/validation:
 *   get:
 *     summary: Get classifier job's validation status
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: id
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Classifier jobs validation status object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassifierJobValidation'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Classifier job not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const options = { readableBy }
  const jobId = req.params.id
  return getValidationStatus(jobId, options)
    .then((result) => res.json(result))
    .catch(httpErrorHandler(req, res, 'Failed getting classificatier job validation status'))
}
