const { httpErrorHandler } = require('../../../utils/http-error-handler')
const Converter = require('../../../utils/converter/converter')
const { get } = require('../../../services/detections/index')

/**
 * @swagger
 *
 * /internal/ai-hub/detections/{id}/{start}:
 *   get:
 *     summary: Get detection by identifier and start time
 *     tags:
 *       - internal
 *     parameters:
 *       - name: id
 *         description: Stream id
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Limit to a start date on (iso8601 or epoch)
 *         in: path
 *         required: true
 *         type: string
 *         example: 2020-01-01T00:00:00.000Z
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Detection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetectionAIHub'
 */
module.exports = (req, res) => {
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super
  const hasSystemRole = req.rfcx.auth_token_info.has_system_role
  const converterParams = new Converter(req.params, {}, true)
  converterParams.convert('id').toInt()
  converterParams.convert('start').toMomentUtc()

  const converterQuery = new Converter(req.query, {}, true)
  converterQuery.convert('fields').optional().toArray()

  converterParams.validate()
    .then(async (params) => {
      const query = await converterQuery.validate()
      const options = {
        readableBy: userIsSuper || hasSystemRole ? undefined : userId,
        fields: query.fields
      }
      const result = await get(params, options)
      return res.json(result)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting detection'))
}
