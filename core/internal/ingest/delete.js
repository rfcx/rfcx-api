const { httpErrorHandler } = require('../../../common/error-handling/http')
// const streamDao = require('../../streams/dao')
// const streamSourceFileDao = require('../../stream-source-files/dao')
// const streamSegmentDao = require('../../stream-segments/dao')
// const fileFormatDao = require('../../stream-segments/dao/file-extensions')
const dao = require('../../stream-source-files/dao')

const Converter = require('../../../common/converter')
const ArrayConverter = require('../../../common/converter/array')
const arbimonService = require('../../_services/arbimon')

/**
 * @swagger
 *
 * /streams/{id}/stream-source-file-and-segments:
 *   delete:
 *     summary: Deletes a stream source file and related segments
 *     tags:
 *       - internal
 *     requestBody:
 *       description: Mixed content of stream source file object and stream segments
 *       required: true
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Invalid query parameters
 */

module.exports = function (req, res) {
  const streamId = req.params.streamId

  const converter = new Converter(req.body, {})
  converter.convert('stream_source_file')
  converter.convert('stream_segments')

  const sfConverter = new Converter(req.body.stream_source_file, {})
  sfConverter.convert('id').toString()

  const segConverter = new ArrayConverter(req.body.stream_segments)
  segConverter.convert('id').toString()
  segConverter.convert('start').toMomentUtc()
  segConverter.convert('path').toString()

  return converter.validate()
    .then(async () => {
      const sfParams = await sfConverter.validate() // validate stream_source_file attributes
      const transformedArray = await segConverter.validate() // validate stream_segment[] attributes

      if (arbimonService.isEnabled && transformedArray.length) {
        await arbimonService.deleteRecordingsFromSegments(streamId, transformedArray)
      }

      const streamSourceFile = await dao.get(sfParams.id)
      await dao.remove(streamSourceFile)
      res.sendStatus(204)
    })
    .catch((err) => {
      console.error('Failed deleting stream source file and segments', err)
      httpErrorHandler(req, res, 'Failed deleting stream source file and segments')(err)
    })
}
