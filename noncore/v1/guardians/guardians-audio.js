const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const takeContentTypeFromFileExtMiddleware = require('../../../common/middleware/legacy/take-content-type-from-file-ext')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)

router.use(takeContentTypeFromFileExtMiddleware)

router.route('/:guardian_id/audio')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const dbQuery = { guardian_id: dbGuardian.id }
        const dateClmn = 'measured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gt] = req.rfcx.starting_after }
        const dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : 'DESC'

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            include: [
              { model: models.Guardian, as: 'Guardian', attributes: ['guid'] },
              { model: models.GuardianSite, as: 'Site', attributes: ['guid', 'timezone', 'timezone_offset'] },
              { model: models.GuardianAudioFormat, as: 'Format', attributes: ['sample_rate'] }
            ],
            order: [[dateClmn, dbQueryOrder]],
            limit: req.rfcx.limit,
            offset: req.rfcx.offset
          }).then(function (dbAudio) {
            if (dbAudio.length < 1) {
              httpErrorResponse(req, res, 404, 'database')
            } else {
              views.models.guardianAudioJson(dbAudio)
                .then(function (json) { res.status(200).json(json) })
            }

            return null
          }).catch(function (err) {
            console.error('failed to return audio | ' + err)
            if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
          })
      }).catch(function (err) {
        console.error('failed to find guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to find guardian' }) }
      })
  })

router.route('/:guardian_id/audio')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      })
      .then((dbGuardian) => {
        if (!dbGuardian) {
          throw new Error(`Guardian with guid ${req.params.guardian_id} not found.`)
        }
        console.info('Creating Audio for guardian : ' + req.params.guardian_id)
        req.body.guardian_id = dbGuardian.id
        req.body.site_id = dbGuardian.site_id
        return models.GuardianSite.findOne({ where: { id: dbGuardian.site_id } })
      })
      .then((dbSite) => {
        req.body.timezone = dbSite.timezone
        return views.models.transformCreateAudioRequestToModel(req.body)
      })
      .then((dbModel) => {
        return models.GuardianAudio.create(dbModel)
      })
      .then((result) => {
        res.status(200).json(result)
      })
      .catch((err) => {
        if (!err) {
          console.info('Error was thrown without supplying an error message; please add a specific error message')
          err = 'generic error.'
        }
        console.error(`Manual Audio Upload had error: ${err}`)
        res.status(500).json({ msg: 'Failed to create audio: ' + err })
      })
  })

router.route('/:guardian_id/audio/withmeta')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    ['codec', 'mime', 'file_extension', 'sample_rate', 'bit_rate', 'is_vbr', 'channel_count'].forEach((meta) => {
      if (!req.body[meta]) {
        throw new Error(`"${meta}" attribute is required`)
      }
    })
    const formatOpts = {
      codec: req.body.codec,
      mime: req.body.mime,
      file_extension: req.body.file_extension,
      sample_rate: req.body.sample_rate,
      target_bit_rate: req.body.bit_rate,
      is_vbr: req.body.is_vbr,
      channel_count: req.body.channel_count
    }
    models.GuardianAudioFormat.findOrCreate({
      where: formatOpts
    })
      .spread((dbFormat, created) => {
        req.body.format_id = dbFormat.id
        return models.Guardian.findOne({
          where: { guid: req.params.guardian_id }
        })
      })
      .then((dbGuardian) => {
        if (!dbGuardian) {
          throw new Error(`Guardian with guid ${req.params.guardian_id} not found.`)
        }
        console.info('Creating Audio for guardian : ' + req.params.guardian_id)
        req.body.guardian_id = dbGuardian.id
        req.body.site_id = dbGuardian.site_id
        return models.GuardianSite.findOne({ where: { id: dbGuardian.site_id } })
      })
      .then((dbSite) => {
        req.body.timezone = dbSite.timezone
        return views.models.transformCreateAudioRequestToModel(req.body)
      })
      .then((dbModel) => {
        return models.GuardianAudio.create(dbModel)
      })
      .then((result) => {
        res.status(200).json(result)
      })
      .catch((err) => {
        if (!err) {
          console.info('Error was thrown without supplying an error message; please add a specific error message')
          err = 'generic error.'
        }
        console.error(`Manual Audio Upload had error: ${err}`)
        res.status(500).json({ msg: 'Failed to create audio: ' + err })
      })
  })

module.exports = router
