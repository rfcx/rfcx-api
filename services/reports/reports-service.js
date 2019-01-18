var models = require("../../models");
var sequelize = require("sequelize");
var Converter = require("../../utils/converter/converter");
var Promise = require("bluebird");
const util = require('util');
const request = require('request');
const moment = require('moment-timezone');
const hash = require('../../utils/misc/hash').hash;
const path = require('path')
const guid = require('../../utils/misc/guid');
const S3Service = require('../s3/s3-service');
const sqlUtils = require("../../utils/misc/sql");
const loggers = require('../../utils/logger');

const reportsQueryBase =
  `SELECT Report.guid, Report.reported_at, Report.created_at, Report.updated_at, Report.lat, Report.long, Report.distance,
  Report.age_estimate, Report.audio,
  CONVERT_TZ(Report.reported_at, "UTC", Site.timezone) as reported_at_local,
  Site.guid AS site_guid, Site.name as site_name, Site.timezone as site_timezone,
  User.guid AS user_guid, User.firstname AS user_firstname, User.lastname AS user_lastname, User.email AS user_email,
  Value.value AS value
  FROM Reports AS Report
  LEFT JOIN GuardianSites AS Site ON Report.site = Site.id
  LEFT JOIN Users AS User ON Report.reporter = User.id
  LEFT JOIN GuardianAudioEventValues AS Value ON Report.value = Value.id `;

function prepareFilterOpts(req) {

  let order, dir;
  if (req.query.order) {
    order;
    dir = 'ASC';
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase();
    }
    switch (req.query.order) {
      case 'site':
        order = 'Site.name';
        break;
      case 'longitude':
        order = 'Report.long';
        break;
      case 'latitude':
        order = 'Report.lat';
        break;
      case 'created_at':
        order = 'Report.created_at';
        break;
      case 'distance':
        order = 'Report.distance';
        break;
      case 'value':
        order = 'Value.value';
        break;
      case 'age_estimate':
        order = 'Report.age_estimate';
        break;
      case 'reported_at':
      default:
        order = 'Report.reported_at';
        break;
    }
  }

  return {
    limit: req.query.limit? parseInt(req.query.limit) : 10000,
    offset: req.query.offset? parseInt(req.query.offset) : 0,
    updatedAfter: req.query.updated_after,
    updatedBefore: req.query.updated_before,
    createdAfter: req.query.created_after,
    createdBefore: req.query.created_before,
    reportedAfter: req.query.reported_after,
    reportedBefore: req.query.reported_before,
    reportedAfterLocal: req.query.reported_after_local,
    reportedBeforeLocal: req.query.reported_before_local,
    latitude: req.query.latitude? parseFloat(req.query.latitude) : undefined,
    minLatitude: req.query.min_latitude? parseFloat(req.query.min_latitude) : undefined,
    maxLatitude: req.query.max_latitude? parseFloat(req.query.max_latitude) : undefined,
    longitude: req.query.longitude? parseFloat(req.query.longitude) : undefined,
    minLongitude: req.query.min_longitude? parseFloat(req.query.min_longitude) : undefined,
    maxLongitude: req.query.max_longitude? parseFloat(req.query.max_longitude) : undefined,
    hasDistance: req.query.has_distance !== undefined? req.query.has_distance !== 'false' : undefined,
    distance: req.query.distance,
    minDistance: req.query.min_distance,
    maxDistance: req.query.max_distance,
    ageEstimate: req.query.age_estimate,
    minAgeEstimate: req.query.min_age_estimate,
    maxAgeEstimate: req.query.max_age_estimate,
    hasAudio: req.query.has_audio !== undefined? req.query.has_audio !== 'false' : undefined,
    values: req.query.values? (Array.isArray(req.query.values)? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    search: req.query.search? '%' + req.query.search + '%' : undefined,
    order: order? order : 'Report.reported_at',
    dir: dir? dir : 'ASC',
  };

}

function prepareQueryFilters(sql, opts) {
  let query = ''
  query = sqlUtils.condAdd(sql, true, ' AND !(Report.lat = 0 AND Report.long = 0)');
  query = sqlUtils.condAdd(query, opts.updatedAfter, ' AND Report.updated_at > :updatedAfter');
  query = sqlUtils.condAdd(query, opts.updatedBefore, ' AND Report.updated_at < :updatedBefore');
  query = sqlUtils.condAdd(query, opts.createdAfter, ' AND Report.created_at > :createdAfter');
  query = sqlUtils.condAdd(query, opts.createdBefore, ' AND Report.created_at < :createdBefore');
  query = sqlUtils.condAdd(query, opts.reportedAfter, ' AND Report.reported_at > :reportedAfter');
  query = sqlUtils.condAdd(query, opts.reportedBefore, ' AND Report.reported_at < :reportedBefore');
  query = sqlUtils.condAdd(query, opts.reportedAfterLocal, ' AND Report.reported_at > DATE_SUB(:reportedAfterLocal, INTERVAL 12 HOUR)');
  query = sqlUtils.condAdd(query, opts.reportedBeforeLocal, ' AND Report.reported_at < DATE_ADD(:reportedBeforeLocal, INTERVAL 14 HOUR)');
  query = sqlUtils.condAdd(query, opts.latitude, ' AND Report.lat LIKE :latitude');
  query = sqlUtils.condAdd(query, opts.minLatitude, ' AND Report.lat >= :minLatitude');
  query = sqlUtils.condAdd(query, opts.maxLatitude, ' AND Report.lat <= :maxLatitude');
  query = sqlUtils.condAdd(query, opts.longitude, ' AND Report.long LIKE :longitude');
  query = sqlUtils.condAdd(query, opts.minLongitude, ' AND Report.long >= :minLongitude');
  query = sqlUtils.condAdd(query, opts.maxLongitude, ' AND Report.long <= :maxLongitude');
  query = sqlUtils.condAdd(query, opts.hasDistance === true, ' AND Report.distance IS NOT NULL');
  query = sqlUtils.condAdd(query, opts.hasDistance === false, ' AND Report.distance IS NULL');
  query = sqlUtils.condAdd(query, opts.distance, ' AND Report.distance = :distance');
  query = sqlUtils.condAdd(query, opts.minDistance, ' AND Report.distance >= :minDistance');
  query = sqlUtils.condAdd(query, opts.maxDistance, ' AND Report.distance <= :maxDistance');
  query = sqlUtils.condAdd(query, opts.ageEstimate, ' AND Report.age_estimate = :ageEstimate');
  query = sqlUtils.condAdd(query, opts.minAgeEstimate, ' AND Report.age_estimate >= :minAgeEstimate');
  query = sqlUtils.condAdd(query, opts.maxAgeEstimate, ' AND Report.age_estimate <= :maxAgeEstimate');
  query = sqlUtils.condAdd(query, opts.hasAudio === true, ' AND Report.audio IS NOT NULL');
  query = sqlUtils.condAdd(query, opts.hasAudio === false, ' AND Report.audio IS NULL');
  query = sqlUtils.condAdd(query, opts.values, ' AND Value.value IN (:values)');
  query = sqlUtils.condAdd(query, opts.sites, ' AND Site.guid IN (:sites)');
  query = sqlUtils.condAdd(query, opts.search, ' AND (Report.guid LIKE :search');
  query = sqlUtils.condAdd(query, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search');
  query = sqlUtils.condAdd(query, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search');
  query = sqlUtils.condAdd(query, opts.search, ' OR User.email LIKE :search');
  query = sqlUtils.condAdd(query, opts.search, ' OR Value.value LIKE :search)');
  return query;
}

function countData(req) {

  const opts = prepareFilterOpts(req);

  let sql =
    `SELECT Report.reported_at, Site.timezone as site_timezone FROM Reports AS Report
      LEFT JOIN GuardianSites AS Site ON Report.site = Site.id
      LEFT JOIN Users AS User ON Report.reporter = User.id
      LEFT JOIN GuardianAudioEventValues AS Value ON Report.value = Value.id
      WHERE 1=1 `;

  sql = prepareQueryFilters(sql, opts);

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((items) => {
      let i = filterWithTz(opts, items);
      return i.length;
    });

}

function queryData(req) {

  const opts = prepareFilterOpts(req);

  let sql = `${reportsQueryBase} WHERE 1=1 `;

  sql = prepareQueryFilters(sql, opts);

  sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);
  sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

  return models.sequelize
    .query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
    )
    .then((events) => {
      return filterWithTz(opts, events);
    });

}

function filterWithTz(opts, reports) {
  return reports.filter((report) => {
    let reportedAtTz = moment.tz(report.reported_at, report.site_timezone);

    if (opts.reportedAfterLocal) {
      if (reportedAtTz < moment.tz(opts.reportedAfterLocal, report.site_timezone)) {
        return false;
      }
    }
    if (opts.reportedBeforeLocal) {
      if (reportedAtTz > moment.tz(opts.reportedBeforeLocal, report.site_timezone)) {
        return false;
      }
    }
    return true;
  });
}

function getReportByGuid(guid) {
  return models.Report
    .findOne({
      where: { guid },
      include: [{ all: true }]
    })
    .then((report) => {
      if (!report) { throw new sequelize.EmptyResultError('Report with given guid not found.'); }
      return report;
    });
}

function createReport(data) {
  data.guid = data.guid? data.guid : guid.generate();
  return models.Report
    .create(data)
    .then(report => {
      return report.reload({ include: [{ all: true }] });
    });
}

function uploadAudio(file, guid, time) {
  let s3Path = getS3PathForReportAudio(time);
  let fileName = `${guid}${path.extname(file.originalname)}`;
  return new Promise((resolve, reject) => {
    S3Service.putObject(file.path, `/${s3Path}/${fileName}`, process.env.ASSET_BUCKET_REPORT)
      .then(() => {
        resolve(fileName);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function formatReport(report) {
  return {
    guid: report.guid,
    reported_at: report.reported_at,
    reported_at_local: moment.tz(report.reported_at, report.Site.timezone || 'UTC').format("YYYY-MM-DD HH:mm:ss.SSS"),
    lat: report.lat,
    long: report.long,
    distance: report.distance,
    age_estimate: report.age_estimate,
    audio: report.audio,
    value: report.Value.value,
    reporter: {
      guid: report.User.guid,
      firstname: report.User.firstname,
      lastname: report.User.lastname,
      email: report.User.email,
    },
    site: {
      guid: report.Site.guid,
      name: report.Site.name,
      timezone: report.Site.timezone,
    },
  };
}

function formatRaWReport(report) {
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
    reporter: {
      guid: report.user_guid,
      firstname: report.user_firstname,
      lastname: report.user_lastname,
      email: report.user_email,
    },
    site: {
      guid: report.site_guid,
      name: report.site_name,
      timezone: report.site_timezone,
    },
  };
}

function formatRawReports(reports) {
  return reports.map(formatRaWReport);
}

function getS3PathForReportAudio(time) {
  let momentTime = moment.tz(time, 'UTC');
  return `audio/${momentTime.format('YYYY')}/${momentTime.format('MM')}/${momentTime.format('DD')}`;
}

module.exports = {
  countData,
  queryData,
  getReportByGuid,
  createReport,
  uploadAudio,
  formatReport,
  formatRaWReport,
  formatRawReports,
  getS3PathForReportAudio,
};
