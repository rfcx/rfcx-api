var models = require('../../../models')
var express = require('express')
var router = express.Router()
var views = require('../../../views/v1')
var checkInHelpers = require('../../../utils/rfcx-checkin')
const queueForPrediction = require('../../../utils/rfcx-analysis/queue-for-prediction')
var httpError = require('../../../utils/http-errors.js')
var passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
var Promise = require('bluebird')
var loggers = require('../../../utils/logger')
var sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')
const strArrToJSArr = checkInHelpers.audio.strArrToJSArr
const SensationsService = require('../../../services/legacy/sensations/sensations-service')

var logDebug = loggers.debugLogger.log

router.route('/:guardian_id/checkins')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    // template for json return... to be populated as we progress
    var returnJson = {
      checkin_id: null, // unique guid of the check-in
      audio: [], // array of audio files successfully ingested
      screenshots: [], // array of screenshot images successfully ingested
      messages: [], // array of sms messages successfully ingested
      instructions: {
        messages: [] // array of sms messages that the guardian should send
      }
    }

    // unzip gzipped meta json blob
    checkInHelpers.gzip.unZipJson(req.body.meta)
      .bind({})
      .then(function (json) {
        // checkInHelpers.validator.isMetaValid(json)
        this.json = json
        logDebug('Guardian checkins endpoint: unzipped json', { req: req, json: json })
        // retrieve the guardian from the database
        return models.Guardian.findOne({
          where: { guid: req.params.guardian_id },
          include: [{ all: true }]
        })
      })
      .then(function (dbGuardian) {
        if (!dbGuardian) {
          loggers.errorLogger.log('Guardian with given guid not found', { req: req })
          throw new sequelize.EmptyResultError('Guardian with given guid not found.')
        }
        logDebug('Guardian checkins endpoint: dbGuardian founded', {
          req: req,
          guardian: Object.assign({}, dbGuardian.toJSON())
        })
        dbGuardian.last_check_in = new Date()
        dbGuardian.check_in_count = 1 + dbGuardian.check_in_count
        return dbGuardian.save()
      })
      .then((dbGuardian) => {
        return dbGuardian.reload({ include: [{ all: true }] })
      })
      .then(function (dbGuardian) {
        logDebug('Guardian checkins endpoint: dbGuardian updated', {
          req: req,
          guardian: Object.assign({}, dbGuardian.toJSON())
        })
        this.dbGuardian = dbGuardian
        // add a new checkin to the database
        return models.GuardianCheckIn
          .create({
            guardian_id: dbGuardian.id,
            site_id: dbGuardian.site_id,
            measured_at: timeStampToDate(this.json.measured_at, this.json.timezone_offset),
            queued_at: timeStampToDate(this.json.queued_at, this.json.timezone_offset)
          })
      })
      .then(function (dbCheckIn) {
        logDebug('Guardian checkins endpoint: dbCheckIn created', {
          req: req,
          guardian: dbCheckIn.toJSON()
        })
        this.dbCheckIn = dbCheckIn
        // set checkin guid on global json return object
        returnJson.checkin_id = dbCheckIn.guid
        // save guardian meta data
        return Promise.all([
          checkInHelpers.saveMeta.DataTransfer(strArrToJSArr(this.json.data_transfer, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.CPU(strArrToJSArr(this.json.cpu, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Battery(strArrToJSArr(this.json.battery, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Power(strArrToJSArr(this.json.power, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Network(strArrToJSArr(this.json.network, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.LightMeter(strArrToJSArr(this.json.lightmeter, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.Accelerometer(strArrToJSArr(this.json.accelerometer, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.DiskUsage(strArrToJSArr(this.json.disk_usage, '|', '*'), this.dbGuardian.id, dbCheckIn.id),
          checkInHelpers.saveMeta.GeoLocation(strArrToJSArr(this.json.location, '|', '*'), this.dbGuardian.id, dbCheckIn.id)
        ])
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: metadata saved', { req: req })
        // save reboot events
        return checkInHelpers.saveMeta.RebootEvents(strArrToJSArr(this.json.reboots, '|', '*'), this.dbGuardian.id, this.dbCheckIn.id)
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: RebootEvents finished', { req: req })
        // save software role versions
        return checkInHelpers.saveMeta.SoftwareRoleVersion(strArrToJSArr(this.json.software, '|', '*'), this.dbGuardian.id)
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: SoftwareRoleVersion finished', { req: req })
        // update previous checkin info, if included
        return checkInHelpers.saveMeta.PreviousCheckIns(strArrToJSArr(this.json.previous_checkins, '|', '*'))
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: PreviousCheckIns finished', { req: req })
        // parse, review and save sms messages
        var messageInfo = checkInHelpers.messages.info(this.json.messages, this.dbGuardian.id, this.dbCheckIn.id,
          this.json.timezone_offset)
        logDebug('Guardian checkins endpoint: messageInfo', { req: req, messageInfo: messageInfo })
        var proms = []
        for (const msgInfoInd in messageInfo) {
          var prom = checkInHelpers.messages
            .save(messageInfo[msgInfoInd])
            .then(function (rtrnMessageInfo) {
              return returnJson.messages.push({ id: rtrnMessageInfo.android_id, guid: rtrnMessageInfo.guid })
            })
          proms.push(prom)
        }
        return Promise.all(proms)
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: messages processed', { req: req })
        // parse, review and save screenshots
        var screenShotInfo = checkInHelpers.screenshots.info(req.files.screenshot, strArrToJSArr(this.json.screenshots, '|', '*'),
          this.dbGuardian.id, this.dbGuardian.guid, this.dbCheckIn.id)
        logDebug('Guardian checkins endpoint: screenShotInfo', { req: req, screenShotInfo: screenShotInfo })
        var proms = []
        for (const screenShotInfoInd in screenShotInfo) {
          logDebug('Guardian checkins endpoint: started processing screenshot ' + screenShotInfoInd, {
            req: req,
            screenShotInfoInd: screenShotInfoInd
          })
          var prom = checkInHelpers.screenshots
            .save(screenShotInfo[screenShotInfoInd])
            .then(function (rtrnScreenShotInfo) {
              return returnJson.screenshots.push({ id: rtrnScreenShotInfo.origin_id, guid: rtrnScreenShotInfo.screenshot_id })
            })
          proms.push(prom)
        }
        return Promise.all(proms)
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: screenshots processed', { req: req })
        var self = this
        // parse, review and save audio
        var audioInfo = checkInHelpers.audio.info(req.files.audio, req.rfcx.api_url_domain, strArrToJSArr(this.json.audio, '|', '*'), this.dbGuardian, this.dbCheckIn)
        var proms = []
        for (const audioInfoInd in audioInfo) {
          const info = audioInfo[audioInfoInd]
          var prom = checkInHelpers.audio
            .processUpload(info)
            .bind({})
            .then(function () {
              return checkInHelpers.audio.extractAudioFileMeta(info)
            })
            .then(function () {
              return checkInHelpers.audio.saveToS3(info)
            })
            .then(function () {
              info.timezone = self.dbGuardian.Site ? self.dbGuardian.Site.timezone : 'UTC'
              return checkInHelpers.audio.saveToDb(info)
            })
            .then(function () {
              // this.audioInfoPostQueue = audioInfoPostQueue
              returnJson.audio.push({ id: info.timeStamp, guid: info.audio_guid })
              self.dbCheckIn.request_latency_api = (new Date()).valueOf() - req.rfcx.request_start_time
              return self.dbCheckIn.save()
            })
            .then(function () {
              return SensationsService.createSensationsFromGuardianAudio(info.dbAudioObj.guid)
            })
            .then(function () {
              return checkInHelpers.audio.cleanupCheckInFiles(info)
            })
            .then(function () {
              if (self.dbGuardian) {
                return queueForPrediction(info, self.dbGuardian)
              }
            })
            .then(function () {
              if (process.env.INGEST_SERVICE_ENABLED === 'true') {
                return checkInHelpers.streams.ingestGuardianAudio(info, self.dbGuardian)
              }
            })
            .catch(() => {
              checkInHelpers.audio.cleanupCheckInFiles(info)
            })
          proms.push(prom)
        }
        return Promise.all(proms)
      })
      .then(function () {
        logDebug('Guardian checkins endpoint: audios processed', { req: req })
        logDebug('Guardian checkins endpoint: return json', { req: req, json: returnJson })
        return res.status(200).json(returnJson)
      })
      .catch(ValidationError, function (err) {
        httpError(req, res, 400, null, err.message)
      })
      .catch(sequelize.EmptyResultError, function (err) {
        loggers.errorLogger.log('Failed to save checkin', { req: req, err: err })
        httpError(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        loggers.errorLogger.log('Failed to save checkin', { req: req, err: err })
        httpError(req, res, 500, err, 'failed to save checkin')
      })
  })

router.route('/:guardian_id/checkins')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        var dbQuery = { guardian_id: dbGuardian.id }
        var dateClmn = 'measured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gt] = req.rfcx.starting_after }

        models.GuardianCheckIn
          .findAll({
            where: dbQuery,
            include: [{ all: true }],
            order: [[dateClmn, 'DESC']],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function (dbCheckIn) {
            if (dbCheckIn.length < 1) {
              httpError(req, res, 404, 'database')
            } else {
              views.models.guardianCheckIns(req, res, dbCheckIn)
                .then(function (json) { res.status(200).json(json) })
            }
          }).catch(function (err) {
            console.log(err)
            if (err) { httpError(req, res, 500, 'database') }
          })
      }).catch(function (err) {
        console.log(err)
        if (err) { httpError(req, res, 500, 'database') }
      })
  })

module.exports = router

function timeStampToDate (timeStamp, legacytimeZoneOffset) {
  var asDate = null

  // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
  if (('' + timeStamp).indexOf(':') > -1) {
    // LEGACY TIMESTAMP FORMAT
    asDate = new Date(timeStamp.replace(/ /g, 'T') + legacytimeZoneOffset)
  } else if (timeStamp != null) {
    asDate = new Date(parseInt(timeStamp))
  }
  return asDate
}
