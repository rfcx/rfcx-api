const { httpErrorHandler } = require('../../../utils/http-error-handler')
const Converter = require('../../../utils/converter/converter')
const { review } = require('../../../services/detections/review')

/**
 * @swagger
 *
 * /detections/{id}/{start}/review:
 *   get:
 *     summary: Review detection
 *     tags:
 *       - detections
 *     parameters:
 *       - name: id
 *         description: Detection id
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Limit to a start date on (iso8601 or epoch)
 *         in: path
 *         required: true
 *         type: string
 *         example: 2020-01-01T00:00:00.000Z
 *       - name: positive
 *         description: Confirm or reject the detection
 *         in: body
 *         required: true
 *         type: boolean
 *         example: true
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const userId = req.rfcx.auth_token_info.id
  const userIsSuper = req.rfcx.auth_token_info.is_super

  const converterParams = new Converter(req.params, {}, true)
  converterParams.convert('id').toInt()
  converterParams.convert('start').toMomentUtc()

  const converterQuery = new Converter(req.body, {})
  converterQuery.convert('positive').toBoolean()

  converterParams.validate()
    .then(async (params) => {
      const { positive } = await converterQuery.validate()
      params = {
        ...params,
        positive,
        userId
      }
      const options = {
        readableBy: userIsSuper ? undefined : userId
      }
      await review(params, options)
      return res.sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed reviewing detection'))
}
