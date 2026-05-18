const fs = require('fs')
const rp = require('request-promise')
const { upload } = require('../internal-rfcx/ingest-file-upload')
const guardiansService = require('../../_services/guardians/guardians-service')
const moment = require('moment-timezone')
const path = require('path')
const assetUtils = require('../internal-rfcx/asset-utils').assetUtils

const opusMimes = {
  '.opus': 'audio/opus',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav'
}

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

  // Use the pre-signed URL returned by ingest-service rather than
  // constructing our own AWS-direct S3 PUT via the legacy knox-s3
  // client (S3Service.putObject). The signed URL points at whatever
  // host ingest-service is configured to use:
  //   - upstream / production: a *.s3.<region>.amazonaws.com URL.
  //   - rfcx-local: an https://s3.arbimon.org URL that flows through
  //     the edge to s3-writer + B2/R2.
  // This makes the noncore-mqtt write surface follow the same edge
  // routing as device direct-uploads, instead of bypassing it.
  const ext = path.extname(checkInObj.audio.filePath).toLowerCase()
  const contentType = opusMimes[ext] || 'audio/' + ext.slice(1)
  await rp({
    method: 'PUT',
    url: uploadData.url,
    body: fs.createReadStream(checkInObj.audio.filePath),
    headers: { 'Content-Type': contentType }
  })
  assetUtils.deleteLocalFileFromFileSystem(checkInObj.audio.filePath)
  return checkInObj
}

module.exports = {
  ingestGuardianAudio
}
