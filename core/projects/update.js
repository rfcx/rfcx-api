const { httpErrorHandler } = require('../../common/error-handling/http')
const { update } = require('./bl')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /projects/{id}:
 *   patch:
 *     summary: Update a project
 *     tags:
 *       - projects
 *     parameters:
 *       - name: id
 *         description: project id
 *         in: path
 *         required: true
 *         type: string
 *     requestBody:
 *       description: Project object attributes
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ProjectPatch'
 *     responses:
 *       204:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Project not found
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const updatableBy = user.is_super || user.has_system_role ? undefined : user.id
  const requestSource = req.headers.source
  const idToken = req.headers.authorization
  const id = req.params.id
  const options = { updatableBy, requestSource, idToken }

  const converter = new Converter(req.body, {}, true)
  converter.convert('name').optional().toString()
  converter.convert('description').optional().toString()
  converter.convert('is_public').optional().toBoolean()
  converter.convert('organization_id').optional().toString()
  converter.convert('external_id').optional().toInt()

  return converter.validate()
    .then((params) => update(id, params, options))
    .then(() => res.sendStatus(204))
    .catch(httpErrorHandler(req, res, 'Failed updating project'))
}
