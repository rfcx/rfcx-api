const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const checkInHelpers = require('../../_utils/rfcx-checkin')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const Promise = require('bluebird')
const sequelize = require('sequelize')
const { ValidationError } = require('../../../common/error-handling/errors')
const strArrToJSArr = checkInHelpers.audio.strArrToJSArr

router.route('/:guardian_id/checkins')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    // template for json return... to be populated as we progress
    const returnJson = {
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
        // retrieve the guardian from the database
        return models.Guardian.findOne({
          where: { guid: req.params.guardian_id },
          include: [{ all: true }]
        })
      })
      .then(async function (dbGuardian) {
        if (!dbGuardian) {
          console.error('Guardian with given guid not found', { req: req.guid })
          throw new sequelize.EmptyResultError('Guardian with given guid not found.')
        }
        const checksum = strArrToJSArr(this.json.audio, '|', '*')[0][3]
        const existingAudio = await models.GuardianAudio.findOne({ where: { sha1_checksum: checksum } })
        if (existingAudio) {
          throw new ValidationError('Duplicate audio file.')
        }
        dbGuardian.last_check_in = new Date()
        dbGuardian.check_in_count = 1 + dbGuardian.check_in_count
        return dbGuardian.save()
      })
      .then((dbGuardian) => {
        return dbGuardian.reload({ include: [{ all: true }] })
      })
      .then(function (dbGuardian) {
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
        // save reboot events
        return checkInHelpers.saveMeta.RebootEvents(strArrToJSArr(this.json.reboots, '|', '*'), this.dbGuardian.id, this.dbCheckIn.id)
      })
      .then(function () {
        // save software role versions
        return checkInHelpers.saveMeta.SoftwareRoleVersion(strArrToJSArr(this.json.software, '|', '*'), this.dbGuardian.id)
      })
      .then(function () {
        // update previous checkin info, if included
        return checkInHelpers.saveMeta.PreviousCheckIns(strArrToJSArr(this.json.previous_checkins, '|', '*'))
      })
      .then(function () {
        // parse, review and save sms messages
        const messageInfo = checkInHelpers.messages.info(this.json.messages, this.dbGuardian.id, this.dbCheckIn.id,
          this.json.timezone_offset)
        const proms = []
        for (const msgInfoInd in messageInfo) {
          const prom = checkInHelpers.messages
            .save(messageInfo[msgInfoInd])
            .then(function (rtrnMessageInfo) {
              return returnJson.messages.push({ id: rtrnMessageInfo.android_id, guid: rtrnMessageInfo.guid })
            })
          proms.push(prom)
        }
        return Promise.all(proms)
      })
      .then(function () {
        // parse, review and save screenshots
        const screenshotFile = req.files.find(x => x.filedname === 'screenshot')
        const screenShotInfo = checkInHelpers.screenshots.info(screenshotFile, strArrToJSArr(this.json.screenshots, '|', '*'),
          this.dbGuardian.id, this.dbGuardian.guid, this.dbCheckIn.id)
        const proms = []
        for (const screenShotInfoInd in screenShotInfo) {
          const prom = checkInHelpers.screenshots
            .save(screenShotInfo[screenShotInfoInd])
            .then(function (rtrnScreenShotInfo) {
              return returnJson.screenshots.push({ id: rtrnScreenShotInfo.origin_id, guid: rtrnScreenShotInfo.screenshot_id })
            })
          proms.push(prom)
        }
        return Promise.all(proms)
      })
      .then(function () {
        const self = this
        // parse, review and save audio
        const audioFile = req.files.find(x => x.filedname === 'audio')
        const audioInfo = checkInHelpers.audio.info(audioFile, req.rfcx.api_url_domain, strArrToJSArr(this.json.audio, '|', '*'), this.dbGuardian, this.dbCheckIn)
        const proms = []
        for (const audioInfoInd in audioInfo) {
          const info = audioInfo[audioInfoInd]
          const prom = checkInHelpers.audio
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
              return checkInHelpers.audio.cleanupCheckInFiles(info)
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
        return res.status(200).json(returnJson)
      })
      .catch(ValidationError, function (err) {
        httpErrorResponse(req, res, 400, null, err.message)
      })
      .catch(sequelize.EmptyResultError, function (err) {
        console.error('Failed to save checkin', err)
        httpErrorResponse(req, res, 404, null, err.message)
      })
      .catch(function (err) {
        console.error('Failed to save checkin', err)
        httpErrorResponse(req, res, 500, err, 'failed to save checkin')
      })
  })

router.route('/:guardian_id/checkins')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const dbQuery = { guardian_id: dbGuardian.id }
        const dateClmn = 'measured_at'
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
              httpErrorResponse(req, res, 404, 'database')
            } else {
              views.models.guardianCheckIns(req, res, dbCheckIn)
                .then(function (json) { res.status(200).json(json) })
            }
          }).catch(function (err) {
            console.error(err)
            if (err) { httpErrorResponse(req, res, 500, 'database') }
          })
      }).catch(function (err) {
        console.error(err)
        if (err) { httpErrorResponse(req, res, 500, 'database') }
      })
  })

module.exports = router

function timeStampToDate (timeStamp, legacytimeZoneOffset) {
  let asDate = null

  // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
  if (('' + timeStamp).indexOf(':') > -1) {
    // LEGACY TIMESTAMP FORMAT
    asDate = new Date(timeStamp.replace(/ /g, 'T') + legacytimeZoneOffset)
  } else if (timeStamp != null) {
    asDate = new Date(parseInt(timeStamp))
  }
  return asDate
}
