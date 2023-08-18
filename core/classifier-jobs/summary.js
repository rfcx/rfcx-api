const { httpErrorHandler } = require('../../common/error-handling/http')
const { getSummary } = require('./bl/summary')

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
 *     responses:
 *       200:
 *         description: Classifier jobs summary object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassifierJobSummary'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Classifier job not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
  const options = { readableBy, user } // user is needed for detections dao
  getSummary(req.params.id, {}, options)
    .then(result => { res.json(result) })
    .catch(httpErrorHandler(req, res))
}
