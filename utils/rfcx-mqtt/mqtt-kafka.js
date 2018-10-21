const moment = require("moment-timezone");

function prepareKafkaObject (itemAudioInfo, dbGuardian, dbAudio) {
  let dbAudioObj = itemAudioInfo.dbAudioObj,
      timezone   = dbGuardian.Site.timezone;
  return {
    fileType: dbAudio.Format? dbAudio.Format.mime : null,
    sampleRate: dbAudio.Format? dbAudio.Format.sample_rate: null,
    bitDepth: itemAudioInfo.audio.meta.bitRate,
    timeInMs: dbAudio.Format? Math.round(1000 * dbAudio.capture_sample_count / dbAudio.Format.sample_rate) : null,
    samples: dbAudio.capture_sample_count,
    utc: moment.tz(dbAudio.measured_at, timezone).toISOString(),
    localTime: moment.tz(dbAudio.measured_at, timezone).format(),
    timeZone: timezone,
    audioUrl: `${process.env.ASSET_URLBASE}/audio/${dbAudio.guid}.${dbAudio.Format? dbAudio.Format.file_extension : 'mp3'}`,
    lat: dbGuardian.latitude,
    long: dbGuardian.longitude,
    guardianGuid: dbGuardian.guid,
    audioGuid: dbAudio.guid,
    site: dbGuardian.Site.name,
    spectrogramUrl: `${process.env.ASSET_URLBASE}/audio/${dbAudio.guid}.png`,
    s3bucket: process.env.ASSET_BUCKET_AUDIO,
    s3path: itemAudioInfo.audio.meta.s3Path,
  };
}

module.exports = {
  prepareKafkaObject,
}
