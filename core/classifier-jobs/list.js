const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const usersService = require('../../common/users')
const Converter = require('../../common/converter')
const classifierService = require('./bl/index')

/**
 * @swagger
 *
 * /classifier-jobs:
 *   get:
 *     summary: Get list of classifier jobs
 *     tags:
 *       - jobs
 *     parameters:
 *       - name: status
 *         description: Status of the job (0 initialized, 10 waiting, 20 running, 30 done, 40 error)
 *         in: query
 *         type: int
 *         default: 0
 *       - name: projects
 *         description: Match classifier jobs belonging to one or more projects (by id)
 *         in: query
 *         type: array
 *       - name: created_by
 *         description: Match classifier jobs based on creator (can be `me` or a user guid)
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
 *                 $ref: '#/components/schemas/ClassifierJobs'
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
      const { status, projects, limit, offset, sort } = params
      const permissableBy = await classifierService.getPermissableBy(user)
      let createdBy = params.createdBy
      if (createdBy === 'me') {
        createdBy = permissableBy
      } else if (createdBy) {
        createdBy = (await usersService.getIdByGuid(createdBy)) || -1 // user doesn't exist
      }
      const filters = { projects, status, createdBy }
      const options = { permissableBy, limit, offset, sort }
      const result = await dao.query(filters, options)
      const { total, results } = result
      return res.header('Total-Items', total).json(results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting a list of classifier jobs'))
}
