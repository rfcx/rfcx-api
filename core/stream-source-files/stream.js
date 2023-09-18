const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const dao = require('./dao')
const Converter = require('../../common/converter')
const { ForbiddenError, EmptyResultError } = require('../../common/error-handling/errors')
const rolesService = require('../roles/dao')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-file:
 *   get:
 *     summary: Get a stream source file belonging to a stream
 *     tags:
 *       - stream-source-files
 *     parameters:
 *       - name: filename
 *         description: Filename
 *         in: query
 *         type: string
 *       - name: sha1_checksum
 *         description: List of sha1 checksums
 *         in: query
 *         type: string
 *       - name: sha1_checksum
 *         description: List of sha1 checksums
 *         in: query
 *         type: string
 *       - name: start
 *         description: File timestamp
 *         in: query
 *         type: string
 *       - name: fields
 *         description: Customize included fields and relations
 *         in: query
 *         type: array
 *     responses:
 *       200:
 *         description: Stream source file (lite) object
 *         content:
 *           application/json:
 *             schema:
*                $ref: '#/components/schemas/StreamSourceFileLite'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
router.get('/:id/stream-source-file', function (req, res) {
  const user = req.rfcx.auth_token_info
  const streamId = req.params.id
  const converter = new Converter(req.query, {}, true)
  converter.convert('sha1_checksum').toString()
  converter.convert('start').toMomentUtc()
  converter.convert('filename').optional().toString()
  converter.convert('fields').optional().toArray()

  return converter.validate()
    .then(async (params) => {
      if (!user.has_system_role && !await rolesService.hasPermission(rolesService.READ, user, streamId, rolesService.STREAM)) {
        throw new ForbiddenError('You do not have permission to access this stream.')
      }
      const filters = {
        streamIds: [req.params.id],
        sha1Checksums: [params.sha1Checksum]
      }
      if (params.filename) { filters.filename = [params.filename] }
      const options = {
        fields: params.fields
      }
      const data = await dao.query(filters, options)
      if (!data.results.length) {
        throw new EmptyResultError('Stream source file not found')
      }
      const streamSourceFile = data.results[0]
      return res.json(streamSourceFile)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream source file'))
})

module.exports = router
