const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const usersService = require('../../common/users')
const Converter = require('../../common/converter')
const { Stream } = require('../_models')
const { CREATE, READ, UPDATE, DELETE } = require('../roles/dao')

/**
 * @swagger
 *
 * /streams:
 *   get:
 *     summary: Get list of streams
 *     tags:
 *       - streams
 *     parameters:
 *       - name: name
 *         description: Match exact streams with name (support *)
 *         in: query
 *         type: string
 *       - name: keyword
 *         description: Match streams with name contain with keyword
 *         in: query
 *         type: string
 *       - name: organizations
 *         description: Match streams belonging to one or more organizations (by id)
 *         in: query
 *         type: array
 *       - name: projects
 *         description: Match streams belonging to one or more projects (by id)
 *         in: query
 *         type: array
 *       - name: created_by
 *         description: Match streams based on creator (can be `me` or a user guid)
 *         in: query
 *       - name: updated_after
 *         description: Only return streams that were updated since/after (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: start
 *         description: Match streams starting after (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: end
 *         description: Match streams starting before (iso8601 or epoch)
 *         in: query
 *         type: string
 *       - name: only_public
 *         description: Include public streams only
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: only_deleted
 *         description: Include deleted streams only
 *         in: query
 *         type: boolean
 *         default: false
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
 *         example: is_public,-updated_at
 *         default: -updated_at
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *       - name: permissions
 *         description: Return streams for which you have selected permission
 *         in: query
 *         schema:
 *           type: string
 *           enum:
 *             - "R"
 *             - "U"
 *             - "D"
 *         default: ["R"]
 *     responses:
 *       200:
 *         description: List of streams objects
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
 *                 $ref: '#/components/schemas/Stream'
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const permissableBy = user.is_super || user.has_system_role ? undefined : user.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('name').optional().toString()
  converter.convert('keyword').optional().toString()
  converter.convert('organizations').optional().toArray()
  converter.convert('projects').optional().toArray()
  converter.convert('start').optional().toMomentUtc()
  converter.convert('end').optional().toMomentUtc()
  converter.convert('created_by').optional().toString()
  converter.convert('updated_after').optional().toMomentUtc()
  converter.convert('only_public').optional().toBoolean()
  converter.convert('only_deleted').optional().toBoolean()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('sort').optional().toString()
  converter.convert('fields').optional().toArray()
  converter.convert('permission').default(READ).toString().isEqualToAny([CREATE, READ, UPDATE, DELETE])
  converter.convert('hidden').optional().toBoolean()

  return converter.validate()
    .then(async params => {
      const { name, keyword, organizations, projects, start, end, updatedAfter, onlyPublic, onlyDeleted, limit, offset, sort, fields, permission, hidden } = params
      let createdBy = params.createdBy
      if (createdBy === 'me') {
        createdBy = permissableBy
      } else if (createdBy) {
        createdBy = (await usersService.getIdByGuid(createdBy)) || -1 // user doesn't exist
      }
      const filters = { organizations, projects, start, end, createdBy, updatedAfter }
      if (name) { filters.names = [name] }
      if (keyword) { filters.keywords = [keyword] }
      const options = {
        permissableBy,
        onlyPublic,
        onlyDeleted,
        limit,
        offset,
        sort,
        // TODO remove this hack after fixing apps are using non-lite attributes
        fields: fields !== undefined
          ? fields
          : [...Stream.attributes.full, 'created_by', 'project', 'permissions'],
        permission,
        hidden
      }
      const streamsData = await dao.query(filters, options)
      return res.header('Total-Items', streamsData.total).json(streamsData.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting streams'))
}
