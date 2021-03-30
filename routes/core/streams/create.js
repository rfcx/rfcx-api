const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const streamsService = require('../../../services/streams')
const { randomId } = require('../../../utils/misc/hash')
const Converter = require('../../../utils/converter/converter')
const arbimonService = require('../../../services/arbimon')

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
  const converter = new Converter(req.body, {}, true)
  converter.convert('name').toString()
  converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
  converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
  converter.convert('altitude').optional().toFloat()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean().default(false)
  converter.convert('external_id').optional().toInt()
  converter.convert('project_id').optional().toString()

  return converter.validate()
    .then(async (params) => {
      const stream = {
        ...params,
        id: randomId(),
        createdById: user.id
      }

      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const externalSite = await arbimonService.createSite(stream, req.headers.authorization)
          stream.externalId = externalSite.site_id
        } catch (error) {
          console.error(`Error creating site in Arbimon (stream: ${params.id})`)
        }
      }

      const options = {
        creatableBy: (user.is_super || user.has_system_role) ? undefined : user.id
      }
      const createdStream = await streamsService.create(stream, options)

      return res.location(`/streams/${createdStream.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
}
