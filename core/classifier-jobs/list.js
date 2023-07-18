const { httpErrorHandler } = require('../../common/error-handling/http')
const { query } = require('./dao')
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
 *       - name: projects
 *         description: Match classifier jobs belonging to one or more projects (by id)
 *         in: query
 *         type: array
 *       - name: created_by
 *         description: Match classifier jobs based on creator (only supports `me`)
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
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
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

      const user = req.rfcx.auth_token_info
      const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id
      const createdBy = params.createdBy === 'me' ? readableBy : undefined

      const filters = { projects, status, createdBy }
      const options = { readableBy, limit, offset, sort, fields }
      const { total, results } = await query(filters, options)

      return res.header('Access-Control-Expose-Headers', 'Total-Items').header('Total-Items', total).json(results)
    })
    .catch(httpErrorHandler(req, res))
}
