const moment = require("moment-timezone");
const urls = require('../misc/urls');

function prepareKafkaObject (req, itemAudioInfo, dbGuardian, dbAudio) {
  let dbAudioObj = itemAudioInfo.dbAudioObj,
      timezone   = dbGuardian.Site.timezone;
  return {
    fileType: dbAudio.Format? dbAudio.Format.mime : null,
    sampleRate: dbAudio.Format? dbAudio.Format.sample_rate: null,
    bitDepth: itemAudioInfo.capture_bitrate,
    timeInMs: dbAudio.Format? Math.round(1000 * dbAudioObj.capture_sample_count / dbAudio.Format.sample_rate) : null,
    samples: dbAudioObj.capture_sample_count,
    utc: moment.tz(dbAudioObj.measured_at, timezone).toISOString(),
    localTime: moment.tz(dbAudioObj.measured_at, timezone).format(),
    timeZone: timezone,
    audioUrl: urls.getAudioAssetsUrl(req, dbAudioObj.guid, dbAudio.Format? dbAudio.Format.file_extension : 'mp3'),
    lat: dbGuardian.latitude,
    long: dbGuardian.longitude,
    guardianGuid: dbGuardian.guid,
    audioGuid: dbAudio.guid,
    site: dbAudio.Site.name,
    spectrogramUrl: urls.getSpectrogramAssetsUrl(req, dbAudio.guid),
    s3bucket: process.env.ASSET_BUCKET_AUDIO,
    s3path: itemAudioInfo.s3Path,
  };
}

module.exports = {
  prepareKafkaObject,
}
