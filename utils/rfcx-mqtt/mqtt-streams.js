const streamsUploadService = require('../../services/streams/streams-uploads-service');
const streamsService = require('../../services/streams/streams-service');
const streamsTimescaleService = require('../../services/streams-timescale');
const S3Service = require('../../services/s3/s3-service');
const moment = require('moment-timezone');
const path = require('path');

function ingestGuardianAudio(checkInObj) {
  return streamsService.ensureStreamExistsForGuardian(checkInObj.db.dbGuardian)
    .then(() => {
      return streamsTimescaleService.ensureStreamExistsForGuardian(checkInObj.db.dbGuardian)
    })
    .then(() => {
      const uploadData = {
        filename: path.basename(checkInObj.audio.meta.s3Path),
        timestamp: moment.tz(checkInObj.audio.meta.measuredAt, 'UTC').toISOString(),
        stream: checkInObj.db.dbGuardian.guid,
        checksum: checkInObj.audio.meta.sha1CheckSum,
        targetBitrate: checkInObj.audio.meta.bitRate,
        sampleRate: checkInObj.audio.meta.sampleRate
      }
      return streamsUploadService.requestUpload(uploadData);
    })
    .then((data) => {
      return S3Service.copyObject(process.env.ASSET_BUCKET_AUDIO, checkInObj.audio.meta.s3Path, data.bucket, data.path);
    })
    .then(() => {
      return checkInObj;
    })
}

module.exports = {
  ingestGuardianAudio,
}
