const { httpErrorHandler } = require('../../common/error-handling/http')
const { getResults } = require('./bl/results')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs/{id}/results:
 *   get:
 *     summary: Get classifier job's results
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: id
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         type: string
 *       - name: fields
 *         description: Customize included fields ('review_status' and/or 'classifications_summary')
 *         in: query
 *         type: array
 *         default: ['review_status']
 *     responses:
 *       200:
 *         description: Classifier jobs review status object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassifierJobResults'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Classifier job not found
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  const user = req.rfcx.auth_token_info
  const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

  converter.convert('fields').optional().toArray().isEqualToAny(['review_status', 'classifications_summary']).default(['review_status'])

  return converter.validate()
    .then(async params => {
      const { fields } = params
      const options = { readableBy, user, fields } // user is needed for detections dao
      const results = await getResults(req.params.id, options)
      res.json(results)
    })
    .catch(httpErrorHandler(req, res))
}
