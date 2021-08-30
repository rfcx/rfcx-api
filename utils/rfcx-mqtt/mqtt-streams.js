const { upload } = require('../../services/streams/source-file-upload')
const streamsTimescaleService = require('../../services/streams')
const guardiansService = require('../../../services/guardians/guardians-service')
const S3Service = require('../../services/legacy/s3/s3-service')
const moment = require('moment-timezone')
const path = require('path')

async function ingestGuardianAudio (checkInObj) {
  const guardian = await guardiansService.getGuardianByGuid(checkInObj.db.dbGuardian.guid)
  if (!guardian.stream_id) {
    return checkInObj
  }

  const uploadData = await upload({
    filename: path.basename(checkInObj.audio.meta.s3Path),
    timestamp: moment.tz(checkInObj.audio.meta.measuredAt, 'UTC').toISOString(),
    stream: checkInObj.db.dbGuardian.guid,
    checksum: checkInObj.audio.meta.sha1CheckSum,
    targetBitrate: checkInObj.audio.meta.bitRate,
    sampleRate: checkInObj.audio.meta.sampleRate
  })
  await S3Service.copyObject(process.env.ASSET_BUCKET_AUDIO, checkInObj.audio.meta.s3Path, uploadData.bucket, uploadData.path)

  return checkInObj
}

module.exports = {
  ingestGuardianAudio
}
