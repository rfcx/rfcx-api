const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')

/**
 * @swagger
 *
 * /classifiers:
 *   get:
 *     summary: Get list of classifiers (models) matching search criteria
 *     tags:
 *       - classifiers
 *     parameters:
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
 *         description: Fields used to sort results
 *         in: query
 *         type: int
 *         default: 'name,-version'
 *       - name: fields
 *         description: Customize included fields
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of classifier objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ClassifierLite'
 *       400:
 *         description: Invalid query parameters
 */
module.exports = (req, res) => {
  const converter = new Converter(req.query, {}, true)
  converter.convert('limit').default(100).toInt()
  converter.convert('offset').default(0).toInt()
  converter.convert('sort').default('name,-version').toString()
  converter.convert('fields').default(['id', 'name', 'version']).toArray()

  return converter.validate().then(async params => {
    const user = req.rfcx.auth_token_info
    const readableBy = user && (user.is_super || user.has_system_role) ? undefined : user.id

    const options = { ...params, readableBy }
    const { results } = await dao.query({}, options)

    return res.json(results)
  }).catch(httpErrorHandler(req, res))
}
