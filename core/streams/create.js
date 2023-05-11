const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const { randomId } = require('../../common/crypto/random')
const Converter = require('../../common/converter')
const arbimonService = require('../_services/arbimon')
const { ValidationError } = require('../../common/error-handling/errors')

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
  converter.convert('id').optional().toString().minLength(12).maxLength(12).isPassingRegExp(/[a-z0-9]{12}/, 'should have only lowercase characters and integers')
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
        createdById: user.id
      }
      if (!params.id) {
        stream.id = randomId()
      }

      if (params.projectId) {
        const duplicateStreamInProject = await dao.query({ name: params.name, projects: [params.projectId] }, { fields: 'id' })
        if (duplicateStreamInProject.total > 0) {
          throw new ValidationError('Duplicate stream name in the project')
        }
      }

      // TODO move - route handler should not contain business logic
      if (arbimonService.isEnabled && req.headers.source !== 'arbimon') {
        try {
          const externalSite = await arbimonService.createSite(stream, req.headers.authorization)
          stream.externalId = externalSite.site_id
        } catch (error) {
          console.error(`Error creating site in Arbimon (stream: ${stream.id})`)
          throw new Error()
        }
      }

      const options = {
        creatableBy: (user.is_super || user.has_system_role) ? undefined : user.id
      }
      const createdStream = await dao.create(stream, options)

      return res.location(`/streams/${createdStream.id}`).sendStatus(201)
    })
    .catch(httpErrorHandler(req, res, 'Failed creating stream'))
}
