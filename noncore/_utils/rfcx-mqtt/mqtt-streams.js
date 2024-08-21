const { upload } = require('../internal-rfcx/ingest-file-upload')
const guardiansService = require('../../_services/guardians/guardians-service')
const S3Service = require('../../_services/legacy/s3/s3-service')
const moment = require('moment-timezone')
const path = require('path')
const assetUtils = require('../internal-rfcx/asset-utils').assetUtils

async function ingestGuardianAudio (checkInObj) {
  const guardian = await guardiansService.getGuardianByGuid(checkInObj.db.dbGuardian.guid)
  if (!guardian.stream_id) {
    return checkInObj
  }

  const uploadData = await upload({
    filename: path.basename(checkInObj.audio.meta.s3Path),
    timestamp: moment.tz(checkInObj.audio.meta.measuredAt, 'UTC').toISOString(),
    stream: checkInObj.db.dbGuardian.stream_id,
    checksum: checkInObj.audio.meta.sha1CheckSum,
    targetBitrate: checkInObj.audio.meta.bitRate,
    sampleRate: checkInObj.audio.meta.sampleRate
  })
  checkInObj.audio.meta.ingestPath = uploadData.path
  checkInObj.audio.meta.ingestBucket = uploadData.bucket
  await S3Service.putObject(checkInObj.audio.filePath, uploadData.path, uploadData.bucket)
  assetUtils.deleteLocalFileFromFileSystem(checkInObj.audio.filePath)
  return checkInObj
}

module.exports = {
  ingestGuardianAudio
}
