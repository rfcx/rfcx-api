const { httpErrorHandler } = require('../../common/error-handling/http')
const Converter = require('../../common/converter')
const { create } = require('./bl')

/**
 * @swagger
 *
 * /streams:
 *   post:
 *     summary: Create a stream
 *     tags:
 *       - streams
 *     requestBody:
 *       description: Stream object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Stream'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Stream'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/streams/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const creatableBy = user.is_super || user.has_system_role ? undefined : user.id
  const requestSource = req.headers.source
  const idToken = req.headers.authorization
  const options = { creatableBy, requestSource, idToken }
  const converter = new Converter(req.body, {}, true)
  converter.convert('id').optional().toString().minLength(12).maxLength(12).isPassingRegExp(/[a-z0-9]{12}/, 'should have only lowercase characters and integers')
  converter.convert('name').toString()
  converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  converter.convert('altitude').optional().toFloat()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean().default(false)
  converter.convert('external_id').optional().toInt()
  converter.convert('project_id').optional().toString()
  converter.convert('hidden').optional().toBoolean()

  return converter.validate()
    .then(async (params) => {
      params.createdById = user.id
      return await create(params, options)
    })
    .then(stream => res.location(`/streams/${stream.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
}
