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
    values: req.query.values? (Array.isArray(req.query.values)? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    search: req.query.search? '%' + req.query.search + '%' : undefined,
    order: order? order : 'Report.reported_at',
    dir: dir? dir : 'ASC',
  };
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

function getS3PathForReportAudio(time) {
  let momentTime = moment.tz(time, 'UTC');
  return `audio/${momentTime.format('YYYY')}/${momentTime.format('MM')}/${momentTime.format('DD')}`;
}

module.exports = {
  prepareFilterOpts,
  getReportByGuid,
  createReport,
  uploadAudio,
  formatReport,
  getS3PathForReportAudio,
};
