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
  getReportByGuid,
  createReport,
  uploadAudio,
  formatReport,
  getS3PathForReportAudio,
};
