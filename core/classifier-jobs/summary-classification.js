const { EmptyResultError } = require('../../common/error-handling/errors')
const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSummary } = require('./bl/summary')

/**
 * @swagger
 *
 * /classifier-jobs/{id}/summary/{value}:
 *   get:
 *     summary: Get classifier job's summary for specific classification in the classifier.
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: id
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: value
 *         description: Classification value
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: falciformis
 *
 *     responses:
 *       200:
 *         description: Classifier job summary object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassificationSummary'
 *       403:
 *         description: Insufficient priviledges
 *       404:
 *         description: Classifier job not found or classification value not found.
 *
 */
module.exports = async (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

  try {
    const result = await getSummary(req.params.id, { classificationValue: req.params.value }, { readableBy })
    if (result.total === 0 || result.results.classificationsSummary.length === 0) {
      throw EmptyResultError('Classifier job summary with given `value` not found.')
    }
    return res.json(result.results.classificationsSummary[0])
  } catch (e) {
    return httpErrorHandler(req, res, 'Failed getting classifier job summary')(e)
  }
}
