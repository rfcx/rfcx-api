const { httpErrorHandler } = require('../../utils/http-error-handler.js')
const { get } = require('../../services/streams/segments')
const { gluedDateStrOrEpochToMoment } = require('../../utils/misc/datetime.js')
const { getSegmentRemotePath } = require('../../services/streams/segment-file-utils')
const storageService = require('../../services/storage')

/**
 * @swagger
 *
 * /streams/{id}/segments/{start}/file:
 *   get:
 *     summary: Get whole segment file matching exact start time
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Segment start timestamp (compact iso8601 or epoch)
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       302:
 *         description: Redirect to signed url
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: Stream or segment not found
 */
module.exports = (req, res) => {
  const streamId = req.params.id
  const start = gluedDateStrOrEpochToMoment(req.params.start)
  const user = req.rfcx.auth_token_info
  const options = {
    readableBy: user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id,
    fields: ['id', 'start', 'stream_id', 'file_extension']
  }
  get(streamId, start, options)
    .then(async (segment) => {
      const url = await getSignedDownloadUrl(segment)
      res.redirect(url)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream segment file'))
}

// TODO Move to business logic layer
async function getSignedDownloadUrl (segment) {
  // TODO Add caching
  const storagePath = getSegmentRemotePath(segment)
  const url = await storageService.getSignedUrl(storageService.buckets.streams, storagePath)
  return url
}
