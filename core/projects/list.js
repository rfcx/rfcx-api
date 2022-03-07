const { httpErrorHandler } = require('../../common/error-handling/http')
const { query } = require('./dao')
const usersService = require('../../common/users/fused')
const rolesService = require('../roles/dao')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /projects:
 *   get:
 *     summary: Get list of projects
 *     tags:
 *       - projects
 *     parameters:
 *       - name: is_public
 *         description: Return public or private projects
 *         in: query
 *         type: boolean
 *       - name: is_deleted
 *         description: Return only your deleted projects
 *         in: query
 *         type: string
 *       - name: created_by
 *         description: Returns different set of projects based on who has created it
 *         in: query
 *         schema:
 *           type: string
 *           enum:
 *             - me
 *       - name: keyword
 *         description: Match projects with name
 *         in: query
 *         type: string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *       - name: sort
 *         description: Order the results (comma-separated list of fields, prefix "-" for descending)
 *         in: query
 *         type: string
 *         example: name
 *         default: -updated_at
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of projects objects
 *         headers:
 *           Total-Items:
 *             schema:
 *               type: integer
 *             description: Total number of items without limit and offset.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectLite'
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const readableBy = user.is_super || user.has_system_role ? undefined : user.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('keyword').optional().toString()
  converter.convert('created_by').optional().toString()
  converter.convert('only_public').optional().toBoolean()
  converter.convert('only_deleted').optional().toBoolean()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('sort').optional().toString()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async params => {
      const { keyword, onlyPublic, onlyDeleted, limit, offset, sort, fields } = params
      let createdBy = params.createdBy
      if (createdBy === 'me') {
        createdBy = readableBy
      } else if (createdBy) {
        createdBy = (await usersService.getIdByGuid(createdBy)) || -1 // user doesn't exist
      }
      const filters = { keyword, createdBy }
      const options = {
        readableBy,
        onlyPublic,
        onlyDeleted,
        limit,
        offset,
        sort,
        fields
      }

      const data = await query(filters, options)
      if (fields && fields.includes('permissions')) {
        if (data.results.length > 0) {
          const projectIds = data.results.map(s => s.id)
          const permissions = await rolesService.getPermissionsForProjects(projectIds, user.id)
          data.results.forEach(s => {
            s.permissions = permissions[s.id]
          })
        }
      }
      return res
        .header('Total-Items', data.total)
        .json(data.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting projects'))
}
