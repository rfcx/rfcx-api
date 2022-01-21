const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const organizationsService = require('../_services/organizations')
const usersService = require('../../common/users/fused')
const Converter = require('../../utils/converter/converter')

/**
 * @swagger
 *
 * /organizations:
 *   get:
 *     summary: Get list of organizations
 *     tags:
 *       - organizations
 *     parameters:
 *       - name: keyword
 *         description: Match organizations with name
 *         in: query
 *         type: string
 *       - name: created_by
 *         description: Match organizations based on creator (can be `me` or a user guid)
 *         in: query
 *         type: string
 *       - name: only_public
 *         description: Return public or private organizations
 *         in: query
 *         type: boolean
 *         default: false
 *       - name: only_deleted
 *         description: Return only your deleted organizations
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
 *         example: name
 *         default: -updated_at
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of organizations objects
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
 *                 $ref: '#/components/schemas/Organization'
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
      const organizationsData = await organizationsService.query(filters, options)
      return res
        .header('Total-Items', organizationsData.total)
        .json(organizationsData.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting organizations'))
}
