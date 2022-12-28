const rolesService = require('../../roles/dao')
const fileFormatDao = require('../dao/file-extensions')
const streamSegmentDao = require('../dao')
const streamSourceFilesDao = require('../../stream-source-files/dao')
const { getSegmentRemotePath } = require('./segment-file-utils')
const S3Service = require('../../../noncore/_services/legacy/s3/s3-service')
const { ForbiddenError, EmptyResultError } = require('../../../common/error-handling/errors')
const { sequelize } = require('../../_models')

async function deleteSegments (user, segmentIds) {
  return await sequelize.transaction(async (transaction) => {
    const segments = await getSegmentData(segmentIds, transaction)
    await checkSegmentPermission(user, segments)
    await deleteSegmentS3(segments)
    await deleteSegmentCore(segments, transaction)
    await deleteStreamSourceFile(segments, transaction)
  })
}

async function getSegmentData (segmentIds, transaction) {
  const segments = (await streamSegmentDao.query(null, {
    ids: segmentIds,
    fields: ['id', 'start', 'end', 'file_extension_id', 'stream_id', 'stream_source_file_id']
  }, transaction)).results
  if (!segments.length) {
    return new EmptyResultError('No segments found')
  }
  return segments
}

async function checkSegmentPermission (user, segments) {
  const uniqStreamIds = [...new Set(segments.map(s => s.stream_id))]
  for (const stream of uniqStreamIds) {
    const allowed = await rolesService.hasPermission('D', user, stream, rolesService.STREAM)
    if (!allowed) {
      throw new ForbiddenError('You do not have permission to delete segments.')
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
  for (const segment of segments) {
    await streamSegmentDao.destroy(segment.start, segment.stream_id, segment.id, transaction)
  }
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
  deleteSegments,
  checkSegmentPermission,
  deleteSegmentCore,
  deleteSegmentS3,
  deleteStreamSourceFile
}
