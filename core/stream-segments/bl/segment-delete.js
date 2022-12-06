const rolesService = require('../../roles/dao')
const fileFormatDao = require('../dao/file-extensions')
const streamSegmentDao = require('../dao')
const streamSourceFilesDao = require('../../stream-source-files/dao')
const { getSegmentRemotePath } = require('./segment-file-utils')
const S3Service = require('../../../noncore/_services/legacy/s3/s3-service')
const { ForbiddenError } = require('../../../common/error-handling/errors')

async function getSegmentData (segmentIds, transaction) {
  return streamSegmentDao.query(null, {
    ids: segmentIds,
    fields: ['id', 'start', 'end', 'file_extension_id', 'stream_id', 'stream_source_file_id']
  }, transaction)
}

async function deleteSegmentAsync (token, segments, transaction) {
  const allowed = await checkSegmentPermission(token, segments)
  if (!allowed) {
    throw new ForbiddenError('You do not have permission to delete segments.')
  }
  await deleteSegmentS3(segments)
  await deleteSegmentCore(segments, transaction)
  await deleteStreamSourceFile(segments, transaction)
}

async function checkSegmentPermission (token, segments) {
  const uniqStreamIds = [...new Set(segments.map(s => s.stream_id))]
  for (const stream of uniqStreamIds) {
    const allowed = await rolesService.hasPermission('D', token, stream, rolesService.STREAM)
    if (!allowed) {
      return false
    }
  }
  return true
}

async function deleteSegmentS3 (segments) {
  const extensions = await fileFormatDao.findAll()
  const paths = segments.map(s => { return getSegmentRemotePath({ ...s, file_extension: s.file_extension ? s.file_extension : extensions.find(ext => ext.id === s.file_extension_id) }) })
  await S3Service.deleteObjects(process.env.INGEST_BUCKET, paths)
}

async function deleteSegmentCore (segments, transaction) {
  await streamSegmentDao.destroy(segments.map(s => s.id), { transaction })
}

/**
 * Delete stream sourse file if there are not any related segments
 * @param {any[]} segments - array of segments' objects
 */
async function deleteStreamSourceFile (segments, transaction) {
  for (const segment of segments) {
    const allSegments = await streamSegmentDao.query(null, { streamSourceFileId: segment.stream_source_file_id }, transaction)
    if (allSegments && !allSegments.length) {
      await streamSourceFilesDao.destroy([segment.stream_source_file_id], { transaction })
    }
  }
}

module.exports = {
  getSegmentData,
  deleteSegmentAsync,
  checkSegmentPermission,
  deleteSegmentCore,
  deleteSegmentS3,
  deleteStreamSourceFile
}
