const { httpErrorHandler } = require('../../common/error-handling/http')
const { get } = require('./bl/get')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs/{id}:
 *   get:
 *     summary: Get a classifier job
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: id
 *         description: Classifier job id
 *         in: path
 *         required: true
 *         type: string
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Classifier jobs object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SingleClassifierJob'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Classifier job not found
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async params => {
      const { fields } = params

      const user = req.rfcx.auth_token_info
      const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

      const options = { readableBy, fields }
      const job = await get(req.params.id, options)
      res.json(job)
    })
    .catch(httpErrorHandler(req, res))
}
