const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const usersService = require('../../common/users')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifier-jobs:
 *   get:
 *     summary: Get list of classifier jobs
 *     tags:
 *       - classifier-jobs
 *     parameters:
 *       - name: status
 *         description: Status of the job (0 waiting, 20 running, 30 done, 40 error, 50 cancelled)
 *         in: query
 *         type: int
 *         default: 0
 *       - name: projects
 *         description: Match classifier jobs belonging to one or more projects (by id)
 *         in: query
 *         type: array
 *       - name: created_by
 *         description: Match classifier jobs based on creator (can be `me` or a user email)
 *         in: query
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
 *         example: -created_at
 *         default: -created_at
 *     responses:
 *       200:
 *         description: List of classifier jobs objects
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
 *                 $ref: '#/components/schemas/ClassifierJob'
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('status').optional().toInt()
  converter.convert('projects').optional().toArray()
  converter.convert('created_by').optional().toString()
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('sort').optional().toString()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async params => {
      const { status, projects, limit, offset, sort, fields } = params
      const permissableBy = usersService.getPermissableBy(user)
      const filters = {
        projects,
        status,
        ...params.createdBy && {
          createdBy: params.createdBy === 'me'
            ? permissableBy
            : (await usersService.getUserByEmail(params.createdBy)) || -1 // user doesn't exist
        }
      }
      const options = { permissableBy, limit, offset, sort, fields }
      const result = await dao.query(filters, options)
      const { total, results } = result
      return res.header('Total-Items', total).json(results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting a list of classifier jobs'))
}
