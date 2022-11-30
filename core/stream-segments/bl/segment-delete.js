const { StreamSegment, Sequelize } = require('../../_models')
const rolesService = require('../../roles/dao')
const fileFormatDao = require('../dao/file-extensions')
const streamSegmentDao = require('../dao')
const streamSourceFilesDao = require('../../stream-source-files/dao')
const { getSegmentRemotePath } = require('./segment-file-utils')
const S3Service = require('../../../noncore/_services/legacy/s3/s3-service')

function getSegmentData (segmentIds, transaction) {
  return StreamSegment.findAll({ where: { id: { [Sequelize.Op.in]: segmentIds } }, raw: true }, { transaction })
}

async function checkSegmentPermission (token, segments) {
  const streamIds = segments.map(s => s.stream_id)
  const uniqStreamIds = streamIds.reduce((acc, cur) => {
    const existing = acc.find(i => i === cur)
    if (!existing) {
      acc.push(cur)
    }
    return acc
  }, [])
  let allowed = true
  for (const stream of uniqStreamIds) {
    allowed = await rolesService.hasPermission('D', token, stream, rolesService.STREAM)
    if (!allowed) {
      return false
    }
  }
  return allowed
}

async function deleteSegmentS3 (segments) {
  const extensions = await fileFormatDao.findAll()
  const paths = segments.map(s => { return getSegmentRemotePath({ ...s, file_extension: extensions.find(ext => ext.id === s.file_extension_id) }) })
  await S3Service.deleteObjects(process.env.INGEST_BUCKET, paths)
}

async function deleteSegmentCore (segments, transaction) {
  await streamSegmentDao.destroy(segments.map(s => s.id), { transaction })
}

async function deleteStreamSourceFiles (segments, transaction) {
  for (const segment of segments) {
    const allSegments = await streamSegmentDao.findSegmentsByStreamSource(segment.stream_source_file_id, transaction)
    if (allSegments && !allSegments.length) {
      await streamSourceFilesDao.destroy([segment.stream_source_file_id], { transaction })
    }
  }
}

module.exports = {
  getSegmentData,
  checkSegmentPermission,
  deleteSegmentCore,
  deleteSegmentS3,
  deleteStreamSourceFiles
}
