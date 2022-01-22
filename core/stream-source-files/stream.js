const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { ForbiddenError } = require('../../common/error-handling/errors')
const auth0Service = require('../_services/auth0/auth0-service')
const rolesService = require('../roles/dao')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-files:
 *   get:
 *     summary: Get list of stream source files belonging to a stream
 *     tags:
 *       - stream-source-files
 *     parameters:
 *       - name: filename
 *         description: List of filenames
 *         in: query
 *         type: array|string
 *       - name: sha1_checksum
 *         description: List of sha1 checksums
 *         in: query
 *         type: array|string
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
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: List of stream source files (lite) objects
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
 *                 $ref: '#/components/schemas/StreamSourceFileLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/stream-source-files', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('filename').optional().toArray()
  converter.convert('sha1_checksum').optional().toArray()
  converter.convert('limit').optional().toInt().default(100)
  converter.convert('offset').optional().toInt().default(0)
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async (params) => {
      const roles = auth0Service.getUserRolesFromToken(req.user)
      if (roles.includes('systemUser')) {
        return params
      }
      const allowed = await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)
      if (!allowed) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      return params
    })
    .then(params => {
      const filters = {
        filenames: params.filename,
        streamIds: [req.params.id],
        sha1Checksums: params.sha1Checksum
      }
      const options = {
        limit: params.limit,
        offset: params.offset,
        fields: params.fields
      }
      return dao.query(filters, options)
    })
    .then(data => {
      return res.header('Total-Items', data.total).json(data.results)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream source files'))
})

module.exports = router
