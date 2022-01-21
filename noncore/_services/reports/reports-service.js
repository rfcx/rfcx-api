const models = require('../../_models')
const sequelize = require('sequelize')
const Promise = require('bluebird')
const moment = require('moment-timezone')
const guid = require('../../../utils/misc/guid')
const sqlUtils = require('../../../utils/misc/sql')
const attachmentService = require('../attachment/attachment-service')

const reportsQueryBase =
  `SELECT Report.guid, Report.reported_at, Report.created_at, Report.updated_at, Report.lat, Report.long, Report.distance,
  Report.age_estimate, Report.audio, Report.notes,
  CONVERT_TZ(Report.reported_at, "UTC", Site.timezone) as reported_at_local,
  Site.guid AS site_guid, Site.name as site_name, Site.timezone as site_timezone,
  User.guid AS user_guid, User.firstname AS user_firstname, User.lastname AS user_lastname, User.email AS user_email,
  Value.value AS value, Attachment.guid AS attachment_guid, Attachment.reported_at AS attachment_reported_at,
  Attachment.url AS attachment_url, Reporter.guid AS attachment_user_guid, Reporter.firstname AS attachment_user_firstname,
  Reporter.lastname AS attachment_user_lastname, Reporter.email AS attachment_user_email,Type.type AS attachment_type
  FROM Reports AS Report
  LEFT JOIN GuardianSites AS Site ON Report.site = Site.id
  LEFT JOIN Users AS User ON Report.reporter = User.id
  LEFT JOIN GuardianAudioEventValues AS Value ON Report.value = Value.id
  LEFT JOIN ReportAttachmentRelations AS ReportAttachmentRelation ON Report.id = ReportAttachmentRelation.report_id
  LEFT JOIN Attachments AS Attachment ON ReportAttachmentRelation.attachment_id = Attachment.id
  LEFT JOIN Users AS Reporter ON Attachment.user_id = Reporter.id
  LEFT JOIN AttachmentTypes AS Type ON Attachment.type_id = Type.id `

function prepareFilterOpts (req) {
  let order, dir
  if (req.query.order) {
    dir = 'ASC'
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase()
    }
    switch (req.query.order) {
      case 'site':
        order = 'Site.name'
        break
      case 'longitude':
        order = 'Report.long'
        break
      case 'latitude':
        order = 'Report.lat'
        break
      case 'created_at':
        order = 'Report.created_at'
        break
      case 'distance':
        order = 'Report.distance'
        break
      case 'value':
        order = 'Value.value'
        break
      case 'age_estimate':
        order = 'Report.age_estimate'
        break
      case 'reported_at':
      default:
        order = 'Report.reported_at'
        break
    }
  }

  return {
    limit: req.query.limit ? parseInt(req.query.limit) : 10000,
    offset: req.query.offset ? parseInt(req.query.offset) : 0,
    updatedAfter: req.query.updated_after,
    updatedBefore: req.query.updated_before,
    createdAfter: req.query.created_after,
    createdBefore: req.query.created_before,
    reportedAfter: req.query.reported_after,
    reportedBefore: req.query.reported_before,
    reportedAfterLocal: req.query.reported_after_local,
    reportedBeforeLocal: req.query.reported_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    weekdays: req.query.weekdays !== undefined ? (Array.isArray(req.query.weekdays) ? req.query.weekdays : [req.query.weekdays]) : undefined,
    latitude: req.query.latitude ? parseFloat(req.query.latitude) : undefined,
    minLatitude: req.query.min_latitude ? parseFloat(req.query.min_latitude) : undefined,
    maxLatitude: req.query.max_latitude ? parseFloat(req.query.max_latitude) : undefined,
    longitude: req.query.longitude ? parseFloat(req.query.longitude) : undefined,
    minLongitude: req.query.min_longitude ? parseFloat(req.query.min_longitude) : undefined,
    maxLongitude: req.query.max_longitude ? parseFloat(req.query.max_longitude) : undefined,
    hasDistance: req.query.has_distance !== undefined ? req.query.has_distance !== 'false' : undefined,
    distance: req.query.distance,
    minDistance: req.query.min_distance,
    maxDistance: req.query.max_distance,
    ageEstimate: req.query.age_estimate,
    minAgeEstimate: req.query.min_age_estimate,
    maxAgeEstimate: req.query.max_age_estimate,
    notes: req.query.notes,
    hasAudio: req.query.has_audio !== undefined ? req.query.has_audio !== 'false' : undefined,
    values: req.query.values ? (Array.isArray(req.query.values) ? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites ? (Array.isArray(req.query.sites) ? req.query.sites : [req.query.sites]) : undefined,
    search: req.query.search ? '%' + req.query.search + '%' : undefined,
    order: order || 'Report.reported_at',
    dir: dir || 'ASC'
  }
}

function prepareQueryFilters (sql, opts) {
  let query = ''
  query = sqlUtils.condAdd(sql, true, ' AND !(Report.lat = 0 AND Report.long = 0)')
  query = sqlUtils.condAdd(query, opts.updatedAfter, ' AND Report.updated_at > :updatedAfter')
  query = sqlUtils.condAdd(query, opts.updatedBefore, ' AND Report.updated_at < :updatedBefore')
  query = sqlUtils.condAdd(query, opts.createdAfter, ' AND Report.created_at > :createdAfter')
  query = sqlUtils.condAdd(query, opts.createdBefore, ' AND Report.created_at < :createdBefore')
  query = sqlUtils.condAdd(query, opts.reportedAfter, ' AND Report.reported_at > :reportedAfter')
  query = sqlUtils.condAdd(query, opts.reportedBefore, ' AND Report.reported_at < :reportedBefore')
  query = sqlUtils.condAdd(query, opts.reportedAfterLocal, ' AND Report.reported_at > DATE_SUB(:reportedAfterLocal, INTERVAL 12 HOUR)')
  query = sqlUtils.condAdd(query, opts.reportedBeforeLocal, ' AND Report.reported_at < DATE_ADD(:reportedBeforeLocal, INTERVAL 14 HOUR)')
  query = sqlUtils.condAdd(query, opts.latitude, ' AND Report.lat LIKE :latitude')
  query = sqlUtils.condAdd(query, opts.minLatitude, ' AND Report.lat >= :minLatitude')
  query = sqlUtils.condAdd(query, opts.maxLatitude, ' AND Report.lat <= :maxLatitude')
  query = sqlUtils.condAdd(query, opts.longitude, ' AND Report.long LIKE :longitude')
  query = sqlUtils.condAdd(query, opts.minLongitude, ' AND Report.long >= :minLongitude')
  query = sqlUtils.condAdd(query, opts.maxLongitude, ' AND Report.long <= :maxLongitude')
  query = sqlUtils.condAdd(query, opts.hasDistance === true, ' AND Report.distance IS NOT NULL')
  query = sqlUtils.condAdd(query, opts.hasDistance === false, ' AND Report.distance IS NULL')
  query = sqlUtils.condAdd(query, opts.distance, ' AND Report.distance = :distance')
  query = sqlUtils.condAdd(query, opts.minDistance, ' AND Report.distance >= :minDistance')
  query = sqlUtils.condAdd(query, opts.maxDistance, ' AND Report.distance <= :maxDistance')
  query = sqlUtils.condAdd(query, opts.ageEstimate, ' AND Report.age_estimate = :ageEstimate')
  query = sqlUtils.condAdd(query, opts.minAgeEstimate, ' AND Report.age_estimate >= :minAgeEstimate')
  query = sqlUtils.condAdd(query, opts.maxAgeEstimate, ' AND Report.age_estimate <= :maxAgeEstimate')
  query = sqlUtils.condAdd(query, opts.hasAudio === true, ' AND Report.audio IS NOT NULL')
  query = sqlUtils.condAdd(query, opts.hasAudio === false, ' AND Report.audio IS NULL')
  query = sqlUtils.condAdd(query, opts.values, ' AND Value.value IN (:values)')
  query = sqlUtils.condAdd(query, opts.sites, ' AND Site.guid IN (:sites)')
  query = sqlUtils.condAdd(query, opts.search, ' AND (Report.guid LIKE :search')
  query = sqlUtils.condAdd(query, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search')
  query = sqlUtils.condAdd(query, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search')
  query = sqlUtils.condAdd(query, opts.search, ' OR User.email LIKE :search')
  query = sqlUtils.condAdd(query, opts.search, ' OR Value.value LIKE :search)')
  return query
}

function countData (req) {
  const opts = prepareFilterOpts(req)

  let sql =
    `SELECT Report.reported_at, Site.timezone as site_timezone FROM Reports AS Report
      LEFT JOIN GuardianSites AS Site ON Report.site = Site.id
      LEFT JOIN Users AS User ON Report.reporter = User.id
      LEFT JOIN GuardianAudioEventValues AS Value ON Report.value = Value.id
      WHERE 1=1 `

  sql = prepareQueryFilters(sql, opts)

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((items) => {
      const i = filterWithTz(opts, items)
      return i.length
    })
}

function queryData (req) {
  const opts = prepareFilterOpts(req)

  let sql = `${reportsQueryBase} WHERE 1=1 `

  sql = prepareQueryFilters(sql, opts)

  sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir)
  // sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((reports) => {
      return combineReportsWithAttachments(reports)
    })
    .then((reports) => {
      return filterWithTz(opts, reports)
    })
    .then((reports) => {
      return {
        total: reports.length,
        reports: limitAndOffset(opts, reports)
      }
    })
}

function limitAndOffset (opts, items) {
  return items.slice(opts.offset, opts.offset + opts.limit)
}

function combineReportsWithAttachments (reports) {
  const resArr = []
  reports.forEach((report) => {
    const reportInResArr = resArr.find((item) => {
      return item.guid === report.guid
    })
    if (reportInResArr) {
      reportInResArr.attachments.push(formatReportAttachment(report))
    } else {
      report.attachments = []
      if (report.attachment_guid) {
        report.attachments.push(formatReportAttachment(report))
      }
      delete report.attachment_guid
      delete report.attachment_reported_at
      delete report.attachment_url
      delete report.attachment_type
      resArr.push(report)
    }
  })
  return resArr
}

function formatReportAttachment (report) {
  return {
    guid: report.attachment_guid,
    reported_at: report.attachment_reported_at,
    url: report.attachment_url,
    reporter: {
      guid: report.attachment_user_guid,
      firstname: report.attachment_user_firstname,
      lastname: report.attachment_user_lastname,
      email: report.attachment_user_email
    },
    type: report.attachment_type
  }
}

function filterWithTz (opts, reports) {
  return reports.filter((report) => {
    const reportedAtTz = moment.tz(report.reported_at, report.site_timezone)

    if (opts.reportedAfterLocal) {
      if (reportedAtTz < moment.tz(opts.reportedAfterLocal, report.site_timezone)) {
        return false
      }
    }
    if (opts.reportedBeforeLocal) {
      if (reportedAtTz > moment.tz(opts.reportedBeforeLocal, report.site_timezone)) {
        return false
      }
    }
    if (opts.weekdays) { // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if (!opts.weekdays.includes(`${parseInt(reportedAtTz.format('E')) - 1}`)) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (reportedAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || reportedAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (reportedAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && reportedAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (reportedAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (reportedAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    return true
  })
}

function getReportByGuid (guid) {
  return models.Report
    .findOne({
      where: { guid },
      include: [
        { model: models.GuardianSite, as: 'Site' },
        { model: models.GuardianAudioEventValue, as: 'Value' },
        { model: models.User },
        { model: models.Attachment, include: [{ all: true }] }
      ]
    })
    .then((report) => {
      if (!report) { throw new sequelize.EmptyResultError('Report with given guid not found.') }
      return report
    })
}

function createReport (data) {
  data.guid = data.guid ? data.guid : guid.generate()
  return models.Report
    .create(data)
    .then(report => {
      return report.reload({ include: [{ all: true }] })
    })
}

function updateReport (report, opts) {
  const allowedOpts = ['lat', 'long', 'distance', 'age_estimate', 'notes']
  allowedOpts.forEach((opt) => {
    if (opts[opt] !== undefined) {
      report[opt] = opts[opt]
    }
  })
  return report.save()
    .then(rep => {
      return rep.reload({ include: [{ all: true }] })
    })
}

function formatReport (report) {
  return {
    guid: report.guid,
    reported_at: report.reported_at,
    reported_at_local: moment.tz(report.reported_at, report.Site.timezone || 'UTC').format('YYYY-MM-DD HH:mm:ss.SSS'),
    lat: report.lat,
    long: report.long,
    distance: report.distance,
    age_estimate: report.age_estimate,
    audio: report.audio,
    value: report.Value.value,
    notes: report.notes,
    reporter: {
      guid: report.User.guid,
      firstname: report.User.firstname,
      lastname: report.User.lastname,
      email: report.User.email
    },
    site: {
      guid: report.Site.guid,
      name: report.Site.name,
      timezone: report.Site.timezone
    },
    attachments: report.Attachments ? attachmentService.formatAttachments(report.Attachments) : []
  }
}

function formatRaWReport (report) {
  return {
    guid: report.guid,
    reported_at: report.reported_at,
    reported_at_local: report.reported_at_local,
    lat: report.lat,
    long: report.long,
    distance: report.distance,
    age_estimate: report.age_estimate,
    audio: report.audio,
    value: report.value,
    notes: report.notes,
    reporter: {
      guid: report.user_guid,
      firstname: report.user_firstname,
      lastname: report.user_lastname,
      email: report.user_email
    },
    site: {
      guid: report.site_guid,
      name: report.site_name,
      timezone: report.site_timezone
    },
    attachments: report.attachments ? report.attachments : []
  }
}

function formatRawReports (reports) {
  return reports.map(formatRaWReport)
}

function attachAttachmentsToReport (attachments, report) {
  const proms = []
  attachments.forEach(attachment => {
    const prom = report.addAttachment(attachment)
    proms.push(prom)
  })
  return Promise.all(proms)
}

function removeReportByGuid (opts) {
  return models.Report
    .destroy({ where: { guid: opts.guid } })
}

module.exports = {
  countData,
  queryData,
  getReportByGuid,
  createReport,
  updateReport,
  formatReport,
  formatRaWReport,
  formatRawReports,
  attachAttachmentsToReport,
  formatReportAttachment,
  removeReportByGuid
}
