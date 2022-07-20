const Promise = require('bluebird')
const urlUtil = require('../../_utils/misc/urls')
const audioUtils = require('../../_utils/rfcx-audio').audioUtils
const models = require('../../_models')
const sqlUtils = require('../../_utils/db/sql-cond-add')
const sequelize = require('sequelize')

const querySelect =
  'SELECT GuardianAudio.guid, GuardianAudio.measured_at, GuardianAudio.size, GuardianAudio.original_filename, ' +
    'GuardianAudio.created_at, GuardianAudio.capture_sample_count, GuardianAudio.encode_duration, ' +
    'CONVERT_TZ(GuardianAudio.measured_at, "UTC", Site.timezone) as measured_at_local, ' +
    'Site.guid AS site_guid, Site.name as site_name, Site.timezone as site_timezone, ' +
    'Guardian.guid AS guardian_guid, Guardian.shortname AS guardian_shortname, ' +
    'Guardian.latitude AS latitude, Guardian.longitude AS longitude, ' +
    'Format.codec as codec, Format.mime as mime, Format.file_extension as file_extension, Format.sample_rate as sample_rate, ' +
    'Format.is_vbr as vbr, Format.target_bit_rate as target_bit_rate '

const countSelect =
  'SELECT COUNT(*) as total '

const queryJoins =
  'LEFT JOIN Guardians AS Guardian ON GuardianAudio.guardian_id = Guardian.id ' +
  'LEFT JOIN GuardianSites AS Site ON GuardianAudio.site_id = Site.id ' +
  'LEFT JOIN GuardianAudioFormats AS Format ON GuardianAudio.format_id = Format.id '

/**
 * weekdays[] is an array with numbers [0, 1, 2, 3, 4, 5, 6]
 * 0 - Monday, 6 is Sunday
 */

function prepareOpts (req) {
  let order, dir
  if (req.query.order) {
    dir = 'ASC'
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase()
    }
    switch (req.query.order) {
      case 'audio_guid':
        order = 'GuardianAudio.audio_guid'
        break
      case 'site':
        order = 'Site.name'
        break
      case 'guardian':
        order = 'Guardian.shortname'
        break
      case 'measured_at':
        order = 'GuardianAudio.measured_at'
        break
      case 'measured_at_local':
        order = 'GuardianAudio.measured_at_local'
        break
      default:
        order = 'GuardianAudio.measured_at'
        break
    }
  }

  const opts = {
    limit: req.query.limit && Math.abs(parseInt(req.query.limit)) ? Math.abs(parseInt(req.query.limit)) : 10000,
    offset: req.query.offset && Math.abs(parseInt(req.query.offset)) ? Math.abs(parseInt(req.query.offset)) : 0,
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
    sites: req.query.sites ? (Array.isArray(req.query.sites) ? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians ? (Array.isArray(req.query.guardians) ? req.query.guardians : [req.query.guardians]) : undefined,
    guardianGroups: req.query.guardian_groups ? (Array.isArray(req.query.guardian_groups) ? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
    excludedGuardians: req.query.excluded_guardians ? (Array.isArray(req.query.excluded_guardians) ? req.query.excluded_guardians : [req.query.excluded_guardians]) : undefined,
    weekdays: req.query.weekdays !== undefined ? (Array.isArray(req.query.weekdays) ? req.query.weekdays : [req.query.weekdays]) : undefined,
    annotated: req.query.annotated !== undefined ? (req.query.annotated === 'true') : undefined,
    order: order || 'GuardianAudio.measured_at',
    dir: dir || 'ASC'
  }
  return Promise.resolve(opts)
}

function addGetQueryParams (sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudio.measured_at > :startingAfter')
  sql = sqlUtils.condAdd(sql, opts.startingBefore, ' AND GuardianAudio.measured_at < :startingBefore')
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND GuardianAudio.measured_at_local > :startingAfterLocal')
  sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND GuardianAudio.measured_at_local < :startingBeforeLocal')
  sql = sqlUtils.condAdd(sql, opts.weekdays, ' AND WEEKDAY(GuardianAudio.measured_at_local) IN (:weekdays)')
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter),
    ' AND TIME(GuardianAudio.measured_at_local) > :dayTimeLocalAfter' +
    ' AND TIME(GuardianAudio.measured_at_local) < :dayTimeLocalBefore')
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore),
    ' AND (TIME(GuardianAudio.measured_at_local) > :dayTimeLocalAfter' +
    ' OR TIME(GuardianAudio.measured_at_local) < :dayTimeLocalBefore)')
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore), ' AND TIME(GuardianAudio.measured_at_local) > :dayTimeLocalAfter')
  sql = sqlUtils.condAdd(sql, (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore), ' AND TIME(GuardianAudio.measured_at_local) < :dayTimeLocalBefore')
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)')
  sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)')
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)')
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudio.updated_at > :updatedAfter')
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudio.updated_at < :updatedBefore')
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudio.created_at > :createdAfter')
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudio.created_at < :createdBefore')
  return sql
}

function queryData (req) {
  return prepareOpts(req)
    .bind({})
    .then((opts) => {
      const queryParams = addGetQueryParams('', opts)

      const sqlCount = `${countSelect} FROM GuardianAudio AS GuardianAudio ${queryJoins} WHERE 1=1 ${queryParams}`

      let sqlQuery = `${querySelect} FROM GuardianAudio AS GuardianAudio ${queryJoins} WHERE 1=1 ${queryParams} `
      sqlQuery = sqlUtils.condAdd(sqlQuery, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir)
      sqlQuery = sqlUtils.condAdd(sqlQuery, opts.limit, ' LIMIT ' + opts.limit)
      sqlQuery = sqlUtils.condAdd(sqlQuery, opts.order, ' OFFSET ' + opts.offset)

      const response = {}

      return models.sequelize
        .query(sqlCount, { replacements: opts, type: models.sequelize.QueryTypes.SELECT })
        .then((data) => {
          response.total = data[0].total
          return models.sequelize.query(sqlQuery, { replacements: opts, type: models.sequelize.QueryTypes.SELECT })
        })
        .then((audios) => {
          response.audios = audios
          return response
        })
    })
}

function getGuidsFromDbAudios (dbAudios) {
  return dbAudios.map((audio) => {
    return audio.guid
  })
}

function combineAssetsUrls (req, guids, extension) {
  return guids.map((guid) => {
    return urlUtil.getAudioAssetsUrl(req, guid, extension)
  })
}

function serveAudioFromS3 (res, filename, s3Bucket, s3Path, inline) {
  const audioStorageUrl = `s3://${s3Bucket}/${s3Path}/${filename}`

  return audioUtils.cacheSourceAudio(audioStorageUrl)
    .then(({ sourceFilePath, headers }) => {
      audioUtils.serveAudioFromFile(res, sourceFilePath, filename, (headers ? headers['content-type'] : null), inline)
    })
}

function getAudioByGuid (guid) {
  return models.GuardianAudio
    .findOne({
      where: { guid },
      include: [{ all: true }]
    })
    .then((item) => {
      if (!item) { throw new sequelize.EmptyResultError('Audio with given guid not found.') }
      return item
    })
}

function formatAudioForSNSMessage (audio) {
  return {
    guid: audio.guid,
    guardian_guid: audio.guardian_guid,
    guardian_shortname: audio.guardian_shortname,
    site_guid: audio.site_guid,
    site_timezone: audio.site_timezone,
    measured_at: audio.measured_at,
    file_extension: audio.file_extension,
    capture_sample_count: audio.capture_sample_count,
    sample_rate: audio.sample_rate,
    latitude: audio.latitude,
    longitude: audio.longitude
  }
}

module.exports = {
  queryData,
  getGuidsFromDbAudios,
  combineAssetsUrls,
  serveAudioFromS3,
  getAudioByGuid,
  formatAudioForSNSMessage
}
