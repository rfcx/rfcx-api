const Promise = require("bluebird");
const moment = require('moment-timezone');

const urlUtil = require("../../utils/misc/urls");
const audioUtils = require("../../utils/rfcx-audio").audioUtils;
const models = require("../../models");
const sqlUtils = require("../../utils/misc/sql");


const querySelect =
  'SELECT GuardianAudio.guid, GuardianAudio.measured_at, GuardianAudio.size, ' +
    'GuardianAudio.created_at, GuardianAudio.capture_sample_count, GuardianAudio.encode_duration, ' +
    'CONVERT_TZ(GuardianAudio.measured_at, "UTC", Site.timezone) as measured_at_local, ' +
    'Site.guid AS site_guid, Site.name as site_name, Site.timezone as site_timezone, ' +
    'Guardian.guid AS guardian_guid, Guardian.shortname AS guardian_shortname, ' +
    'Format.codec as codec, Format.mime as mime, Format.file_extension as file_extension, Format.sample_rate as sample_rate, ' +
    'Format.is_vbr as vbr, Format.target_bit_rate as target_bit_rate, ' +
    'COUNT(DISTINCT GuardianAudioBox.id) as audio_box_count ';

const queryJoins =
  'LEFT JOIN Guardians AS Guardian ON GuardianAudio.guardian_id = Guardian.id ' +
  'LEFT JOIN GuardianSites AS Site ON GuardianAudio.site_id = Site.id ' +
  'LEFT JOIN GuardianAudioFormats AS Format ON GuardianAudio.format_id = Format.id ' +
  'LEFT JOIN GuardianAudioBoxes AS GuardianAudioBox ON GuardianAudio.id = GuardianAudioBox.audio_id ';

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
      case 'site':
        order = 'Site.name';
        break;
      case 'guardian':
        order = 'Guardian.shortname';
        break;
      case 'measured_at':
        order = 'GuardianAudio.measured_at';
        break;
      default:
        order = 'GuardianAudio.measured_at';
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
    startingAfter: req.query.starting_after,
    startingBefore: req.query.starting_before,
    startingAfterLocal: req.query.starting_after_local,
    startingBeforeLocal: req.query.starting_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    guardianGroups: req.query.guardian_groups? (Array.isArray(req.query.guardian_groups)? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
    excludedGuardians: req.query.excluded_guardians? (Array.isArray(req.query.excluded_guardians)? req.query.excluded_guardians : [req.query.excluded_guardians]) : undefined,
    weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    order: order? order : 'GuardianAudio.measured_at',
    dir: dir? dir : 'ASC',
  };

  if (opts.guardianGroups) {
    return guardianGroupService.getGroupsByShortnames(opts.guardianGroups)
      .then((groups) => {
        let guardians = [];
        groups.forEach((group) => {
          (group.Guardians || []).forEach((guardian) => {
            if (!guardians.includes(guardian.guid)) {
              guardians.push(guardian.guid);
            }
          });
        });
        opts.guardians = guardians;
        return opts;
      });
  }
  else {
    return Promise.resolve(opts);
  }
}

function addGetQueryParams(sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudio.measured_at > :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.startingBefore, ' AND GuardianAudio.measured_at < :startingBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND GuardianAudio.measured_at > DATE_SUB(:startingAfterLocal, INTERVAL 12 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND GuardianAudio.measured_at < DATE_ADD(:startingBeforeLocal, INTERVAL 14 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');
  sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudio.updated_at > :updatedAfter');
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudio.updated_at < :updatedBefore');
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudio.created_at > :createdAfter');
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudio.created_at < :createdBefore');
  return sql;
}

function queryData(req) {

  return prepareOpts(req)
    .bind({})
    .then((opts) => {
      let sql = `${querySelect} FROM GuardianAudio AS GuardianAudio ${queryJoins} `;
      sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
      sql = addGetQueryParams(sql, opts);
      sql = sqlUtils.condAdd(sql, true, ' GROUP BY GuardianAudio.id ');
      sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);

      return models.sequelize
        .query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
        .then((audios) => {
          return filterWithTz(opts, audios);
        })
        .then((audios) => {
          return {
            total: audios.length,
            audios: limitAndOffset(opts, audios)
          }
        })
    });

}

function filterWithTz(opts, audios) {
  return audios.filter((audio) => {
    let siteTimezone = audio.site_timezone || 'UTC';
    let measuredAtTz = moment.tz(audio.measured_at, siteTimezone);

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
    if (opts.weekdays) {
      // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if ( !opts.weekdays.includes( `${parseInt(measuredAtTz.format('E')) - 1}` ) ) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (measuredAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false;
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    return true;
  });
}

function limitAndOffset(opts, audios) {
  return audios.slice(opts.offset, opts.offset + opts.limit);
}

function getGuidsFromDbAudios(dbAudios) {
  return dbAudios.map((audio) => {
    return audio.guid;
  });
}

function combineAssetsUrls(req, guids, extension) {
  return guids.map((guid) => {
    return urlUtil.getAudioAssetsUrl(req, guid, extension);
  });
}

function serveAudioFromS3(res, filename, s3Bucket, s3Path, inline) {
  var audioStorageUrl = `s3://${s3Bucket}/${s3Path}/${filename}`;

  return audioUtils.cacheSourceAudio(audioStorageUrl)
    .then(({ sourceFilePath, headers }) => {
      audioUtils.serveAudioFromFile(res, sourceFilePath, filename, (headers? headers['content-type'] : null), inline)
    });
}

function getAudioByGuid(guid) {
  return models.GuardianAudio
    .findOne({
      where: { guid },
      include: [{ all: true }]
    })
    .then((item) => {
      if (!item) { throw new sequelize.EmptyResultError('Audio with given guid not found.'); }
      return item;
    });
}

function removeBoxesForAudioFromUser(audio, user_id) {
  // remove all previous labels for this file from this user
  return models.GuardianAudioBox.destroy({ where: { audio_id: audio.id, created_by: user_id } });
}

function createBoxesForAudio(audio, boxes, user_id) {
  let proms = [];
  boxes.forEach((box) => {
    let prom = models.GuardianAudioEventValue.findOrCreate({
      where: { $or: { value: box.label, id: box.label }},
      defaults: { value: box.label }
    })
    .spread((eventValue, created) => {
      return models.GuardianAudioBox.create({
        confidence: box.confidence || 1,
        freq_min: box.freq_min,
        freq_max: box.freq_max,
        begins_at: box.begins_at,
        ends_at: box.ends_at,
        audio_guid: audio.guid,
        audio_id: audio.id,
        created_by: user_id,
        value: eventValue.id,
      });
    });
    proms.push(prom);
  });
  return Promise.all(proms);
}

module.exports = {
  queryData,
  getGuidsFromDbAudios,
  combineAssetsUrls,
  serveAudioFromS3,
  getAudioByGuid,
  removeBoxesForAudioFromUser,
  createBoxesForAudio,
};
