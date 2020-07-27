const streamsUploadService = require('../../services/streams/streams-uploads-service');
const streamsService = require('../../services/streams/streams-service');
const streamsTimescaleService = require('../../services/streams-timescale');
const S3Service = require('../../services/s3/s3-service');
const moment = require('moment-timezone');
const path = require('path');

function ingestGuardianAudio(audioInfo, dbGuardian) {
  return streamsService.ensureStreamExistsForGuardian(dbGuardian)
    .then(() => {
      return streamsTimescaleService.ensureStreamExistsForGuardian(dbGuardian)
    })
    .then(() => {
      const uploadData = {
        filename: path.basename(audioInfo.s3Path),
        timestamp: moment.tz(audioInfo.measured_at, 'UTC').toISOString(),
        stream: dbGuardian.guid,
        checksum: audioInfo.sha1Hash,
        targetBitrate: audioInfo.dbAudioObj.Format.target_bit_rate,
        sampleRate: audioInfo.dbAudioObj.Format.sample_rate
      }
      return streamsUploadService.requestUpload(uploadData);
    })
    .then((data) => {
      return S3Service.copyObject(process.env.ASSET_BUCKET_AUDIO, audioInfo.s3Path, data.bucket, data.path);
    })
    .then(() => {
      return audioInfo;
    })
}

exports.streams = {
  ingestGuardianAudio,
}
