const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { get } = require('../../../services/streams/segments')
const { gluedDateStrOrEpochToMoment } = require('../../../utils/misc/datetime.js')
const { getSegmentRemotePath } = require('../../../services/streams/segment-file-utils')
const storageService = process.env.PLATFORM === 'google' ? require('../../../services/storage/google') : require('../../../services/storage/amazon')

/**
 * @swagger
 *
 * /streams/{id}/segments/{start}/file:
 *   get:
 *     summary: Get list of stream segments belonging to a stream
 *     tags:
 *       - streams
 *     parameters:
 *       - name: id
 *         description: Stream identifier
 *         in: path
 *         required: true
 *         type: string
 *       - name: start
 *         description: Start timestamp (compact iso8601 or epoch)
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
    readableBy: user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id
  }
  get(streamId, start, options)
    .then(async (segment) => {
      const url = await Promise.resolve('xxx')
      res.status(url)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting stream segment file'))
}

// TODO Move to business logic layer
async function getSignedDownloadUrl(segment) {
  // TODO Add caching
  const storagePath = getSegmentRemotePath(segment)
  const url = await storageService.getSignedUrl()
  return url
}