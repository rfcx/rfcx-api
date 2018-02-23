const models = require('../../models');
const sqlUtils = require('../../utils/misc/sql');

const AUDIO_DURATION = 90; // our audio files last approximately 90 seconds

function getAudioCountWithFilters(opts) {

  let sql = 'SELECT COUNT(*) as count from GuardianAudio as Audio';

  sql = sqlUtils.condAdd(sql, opts.sites || opts.startingAfterLocal || opts.startingBeforeLocal,
    ' LEFT JOIN GuardianSites AS Site ON Audio.site_id = Site.id');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' LEFT JOIN Guardians AS Guardian ON Audio.guardian_id = Guardian.id');
  sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');

  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND CONVERT_TZ(Audio.measured_at, "UTC", Site.timezone) > :startingAfterLocal');
  sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND CONVERT_TZ(Audio.measured_at, "UTC", Site.timezone) < :startingBeforeLocal');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');

  return models.sequelize.query(sql, { replacements: opts, type: models.sequelize.QueryTypes.SELECT });

}

function countToTimes(count) {
  let seconds = AUDIO_DURATION * count;
  let minutes = Math.floor(seconds / 60);
  let hours   = Math.floor(seconds / 60 / 60);
  let days    = Math.floor(seconds / 60 / 60 / 24);
  return {
    seconds,
    minutes,
    hours,
    days,
  };
}

module.exports = {
  getAudioCountWithFilters,
  countToTimes,
}
