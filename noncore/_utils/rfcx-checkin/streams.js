const { upload } = require('../../../core/stream-source-files/bl/file-upload')
const streamDao = require('../../../core/streams/dao')
const S3Service = require('../../_services/legacy/s3/s3-service')
const moment = require('moment-timezone')
const path = require('path')

// TODO this was called from v1/checkin and should not be called now
function ingestGuardianAudio (audioInfo, dbGuardian) {
  return streamDao.ensureStreamExistsForGuardian(dbGuardian)
    .then(() => {
      const uploadData = {
        filename: path.basename(audioInfo.s3Path),
        timestamp: moment.tz(audioInfo.measured_at, 'UTC').toISOString(),
        stream: dbGuardian.guid,
        checksum: audioInfo.sha1Hash,
        targetBitrate: audioInfo.dbAudioObj.Format.target_bit_rate,
        sampleRate: audioInfo.dbAudioObj.Format.sample_rate
      }
      return upload(uploadData)
    })
    .then((data) => {
      return S3Service.copyObject(process.env.ASSET_BUCKET_AUDIO, audioInfo.s3Path, data.bucket, data.path)
    })
    .then(() => {
      return audioInfo
    })
}

exports.streams = {
  ingestGuardianAudio
}
