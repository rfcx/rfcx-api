const { httpErrorHandler } = require('../../common/error-handling/http')
const { create } = require('./bl')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /projects:
 *   post:
 *     summary: Create a project
 *     tags:
 *       - projects
 *     requestBody:
 *       description: Project object
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/Project'
 *     responses:
 *       201:
 *         description: Created
 *         headers:
 *           Location:
 *             description: Path of the created resource (e.g. `/projects/xyz123`)
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query parameters
 */

module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const creatableById = user.is_super || user.has_system_role ? undefined : user.id
  const requestSource = req.headers.source
  const idToken = req.headers.authorization
  const options = { creatableById, requestSource, idToken }

  const converter = new Converter(req.body, {}, true)
  converter.convert('id').optional().toString()
  converter.convert('name').toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').default(false).toBoolean()
  converter.convert('organization_id').optional().toString()
  converter.convert('external_id').optional().toInt()

  return converter.validate()
    .then((params) => create(params, options))
    .then(project => res.location(`/projects/${project.id}`).sendStatus(201))
    .catch(httpErrorHandler(req, res, 'Failed creating project'))
}
