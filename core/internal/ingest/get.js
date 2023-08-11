const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamSourceFileDao = require('../../stream-source-files/dao')
const streamSegmentDao = require('../../stream-segments/dao')
const Converter = require('../../../common/converter')
const rolesService = require('../../roles/dao')
const moment = require('moment-timezone')
const { ForbiddenError, EmptyResultError, ValidationError } = require('../../../common/error-handling/errors')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-file:
 *   get:
 *     summary: Get a stream source file belonging to a stream with segments
 *     tags:
 *       - internal
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
*                $ref: '#/components/schemas/StreamSourceFileLiteWithAvailability'
 *       400:
 *         description: Invalid query parameters
 *       404:
 *         description: Stream not found
 */
module.exports = function (req, res) {
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
      const data = await streamSourceFileDao.query(filters, options)
      const streamSourceFile = data.results[0]
      if (!streamSourceFile) {
        // check if user tries to upload another file with an existing timestamp
        const segments = (await streamSegmentDao.query({
          streamId: req.params.id,
          start: params.start,
          end: params.start.clone().add('1', 'minute')
        }, { fields: ['start'], strict: true })).results
        if (segments.length && moment.utc(segments[0].start).valueOf() === params.start.valueOf()) {
          throw new ValidationError('There is another file with the same timestamp in the stream.')
        } else {
          throw new EmptyResultError('Stream source file not found')
        }
      } else {
        const segments = (await streamSegmentDao.query({
          streamId: req.params.id,
          start: params.start.clone().subtract('1', 'minute'),
          end: params.start.clone().add('1', 'day'),
          streamSourceFileId: streamSourceFile.id
        }, { fields: ['start', 'availability'] })).results
        streamSourceFile.availability = streamSourceFileDao.calcAvailability(segments)
        streamSourceFile.segments = segments
        return res.json(streamSourceFile)
      }
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream source file'))
}
