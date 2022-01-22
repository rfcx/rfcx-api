const { httpErrorHandler } = require('../../common/error-handling/http.js')
const projectsService = require('../_services/projects')
const Converter = require('../../utils/converter')

/**
 * @swagger
 *
 * /projects/{id}:
 *   get:
 *     summary: Get a project
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: Project id
 *         in: path
 *         required: true
 *         type: string
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user.is_super || user.has_system_role ? undefined : user.id

  const converter = new Converter(req.query, {}, true)
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(params => {
      const options = { ...params, readableBy }
      return projectsService.get(req.params.id, options)
    })
    .then(project => res.json(project))
    .catch(httpErrorHandler(req, res, 'Failed getting project'))
}
