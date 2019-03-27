const Promise = require("bluebird");
const moment = require('moment-timezone');
const models = require("../../models");
const sqlUtils = require("../../utils/misc/sql");


const querySelect =
  'SELECT GuardianAudioBox.guid, GuardianAudioBox.audio_guid, GuardianAudioBox.confidence, ' +
  'GuardianAudioBox.freq_min, GuardianAudioBox.freq_max, GuardianAudioBox.begins_at, GuardianAudioBox.ends_at, ' +
  'GuardianAudioBox.created_at, GuardianAudioBox.updated_at, ' +
  'CONVERT_TZ(GuardianAudioBox.begins_at, "UTC", Site.timezone) as begins_at_local, ' +
  'CONVERT_TZ(GuardianAudioBox.ends_at, "UTC", Site.timezone) as ends_at_local, ' +
  'GuardianAudio.guid as audio_guid, GuardianAudio.measured_at as audio_measured_at, ' +
  'CONVERT_TZ(GuardianAudio.measured_at, "UTC", Site.timezone) as audio_measured_at_local, ' +
  'Value.value, ' +
  'User.guid as user_guid, User.email as user_email, User.firstname as user_firstname, User.lastname as user_lastname, ' +
  'Site.timezone as site_timezone ';

const queryJoins =
  'LEFT JOIN GuardianAudio AS GuardianAudio ON GuardianAudioBox.audio_id = GuardianAudio.id ' +
  'LEFT JOIN GuardianSites AS Site ON GuardianAudio.site_id = Site.id ' +
  'LEFT JOIN GuardianAudioEventValues AS Value ON GuardianAudioBox.value = Value.id ' +
  'LEFT JOIN Users AS User ON GuardianAudioBox.created_by = User.id ';

/**
 * weekdays[] is an array with numbers [0, 1, 2, 3, 4, 5, 6]
 * 0 - Monday, 6 is Sunday
 */

function prepareOpts(req) {

  let order, dir;
  if (req.query.order) {
    order;
    dir = 'ASC';
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase();
    }
    switch (req.query.order) {
      case 'audio_guid':
        order = 'GuardianAudio.audio_guid';
        break;
      case 'confidence':
        order = 'GuardianAudioBox.confidence';
        break;
      case 'begins_at':
        order = 'GuardianAudioBox.begins_at';
        break;
      case 'measured_at':
        order = 'GuardianAudio.measured_at';
        break;
      default:
        order = 'GuardianAudioBox.begins_at';
        break;
    }
  }

  let opts = {
    limit: req.query.limit && Math.abs(parseInt(req.query.limit))? Math.abs(parseInt(req.query.limit)) : 10000,
    offset: req.query.offset && Math.abs(parseInt(req.query.offset))? Math.abs(parseInt(req.query.offset)) : 0,
    updatedAfter: req.query.updated_after,
    updatedBefore: req.query.updated_before,
    createdAfter: req.query.created_after,
    createdBefore: req.query.created_before,
    // will sort by audio files START
    startingAfter: req.query.starting_after,
    startingBefore: req.query.starting_before,
    startingAfterLocal: req.query.starting_after_local,
    startingBeforeLocal: req.query.starting_before_local,
    // dayTimeLocalAfter: req.query.daytime_local_after,
    // dayTimeLocalBefore: req.query.daytime_local_before,
    // will sort by audio files END
    audios: req.query.audios? (Array.isArray(req.query.audios)? req.query.audios : [req.query.audios]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    // guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    // guardianGroups: req.query.guardian_groups? (Array.isArray(req.query.guardian_groups)? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
    // excludedGuardians: req.query.excluded_guardians? (Array.isArray(req.query.excluded_guardians)? req.query.excluded_guardians : [req.query.excluded_guardians]) : undefined,
    // weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    userId: (req.query.per_user === 'true' && req.rfcx && req.rfcx.auth_token_info && req.rfcx.auth_token_info.owner_id)? req.rfcx.auth_token_info.owner_id : undefined,
    order: order? order : 'GuardianAudioBox.begins_at',
    dir: dir? dir : 'ASC',
  };

  // if (opts.guardianGroups) {
  //   return guardianGroupService.getGroupsByShortnames(opts.guardianGroups)
  //     .then((groups) => {
  //       let guardians = [];
  //       groups.forEach((group) => {
  //         (group.Guardians || []).forEach((guardian) => {
  //           if (!guardians.includes(guardian.guid)) {
  //             guardians.push(guardian.guid);
  //           }
  //         });
  //       });
  //       opts.guardians = guardians;
  //       return opts;
  //     });
  // }
  // else {
    return Promise.resolve(opts);
  // }
}

function addGetQueryParams(sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudio.measured_at > :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.startingBefore, ' AND GuardianAudio.measured_at < :startingBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND GuardianAudio.measured_at > DATE_SUB(:startingAfterLocal, INTERVAL 12 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND GuardianAudio.measured_at < DATE_ADD(:startingBeforeLocal, INTERVAL 14 HOUR)');
  // sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');
  // sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  sql = sqlUtils.condAdd(sql, opts.audios, ' AND GuardianAudio.guid IN (:audios)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.userId, ' AND GuardianAudioBox.created_by = :userId');
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudioBox.updated_at > :updatedAfter');
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudioBox.updated_at < :updatedBefore');
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudioBox.created_at > :createdAfter');
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudioBox.created_at < :createdBefore');
  return sql;
}

function queryData(req) {

  return prepareOpts(req)
    .bind({})
    .then((opts) => {
      let sql = `${querySelect} FROM GuardianAudioBoxes AS GuardianAudioBox ${queryJoins} `;
      sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
      sql = addGetQueryParams(sql, opts);
      sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);

      return models.sequelize
        .query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
        .then((labels) => {
          this.total = labels.length;
          return filterWithTz(opts, labels);
        })
        .then((labels) => {
          return {
            total: this.total,
            labels: limitAndOffset(opts, labels)
          }
        })
    });

}

function filterWithTz(opts, labels) {
  return labels.filter((label) => {
    let siteTimezone = label.site_timezone || 'UTC';
    let measuredAtTz = moment.tz(label.audio_measured_at, siteTimezone);

    if (opts.startingAfterLocal) {
      if (measuredAtTz < moment.tz(opts.startingAfterLocal, siteTimezone)) {
        return false;
      }
    }
    if (opts.startingBeforeLocal) {
      if (measuredAtTz > moment.tz(opts.startingBeforeLocal, siteTimezone)) {
        return false;
      }
    }
    // if (opts.weekdays) {
    //   // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
    //   // momentjs by default starts day with Sunday, so we will get ISO weekday
    //   // (which starts from Monday, but is 1..7) and subtract 1
    //   if ( !opts.weekdays.includes( `${parseInt(measuredAtTz.format('E')) - 1}` ) ) {
    //     return false;
    //   }
    // }
    // if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
    //   if (measuredAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
    //     return false;
    //   }
    // }
    // if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
    //   if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
    //     return false;
    //   }
    // }
    // if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
    //   if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
    //     return false;
    //   }
    // }
    // if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
    //   if (measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
    //     return false;
    //   }
    // }
    return true;
  });
}

function limitAndOffset(opts, audios) {
  return audios.slice(opts.offset, opts.offset + opts.limit);
}

function calculateTimeOffsetsInSeconds(labels) {
  labels.forEach((label) => {
    label.start = moment(label.begins_at).diff(label.audio_measured_at, 'ms');
    label.end = moment(label.ends_at).diff(label.audio_measured_at, 'ms');
  })
}

function combineAudioUrls(labels) {
  labels.forEach((label) => {
    let urlBase = `${process.env.ASSET_URLBASE}/audio/${label.audio_guid}`;
    label.urls = {
      m4a: `${urlBase}.m4a`,
      mp3: `${urlBase}.mp3`,
      opus: `${urlBase}.opus`,
      png: `${urlBase}.png`
    };
  })
}

module.exports = {
  queryData,
  calculateTimeOffsetsInSeconds,
  combineAudioUrls,
};
