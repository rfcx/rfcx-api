const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const Promise = require('bluebird')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const ApiConverter = require('../../_utils/api-converter')
const urls = require('../../_utils/misc/urls')
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const audioService = require('../../_services/audio/audio-service')
const { ValidationError } = require('../../../common/error-handling/errors')
const { baseInclude, guardianAudioJson } = require('../../views/v1/models/guardian-audio').models

function filter (req) {
  let order = 'measured_at ASC'

  if (req.query.order && ['ASC', 'DESC', 'RAND'].indexOf(req.query.order.toUpperCase()) !== -1) {
    if (req.query.order === 'RAND') {
      order = [sequelize.fn('RAND')]
    } else {
      order = [['measured_at', req.query.order.toUpperCase()]]
    }
  }

  const mainClasuse = {}
  const siteClause = {}
  const guardianClause = {}

  if (req.query.siteGuid) {
    siteClause.guid = req.query.siteGuid
  }
  if (req.query.guardianGuid) {
    guardianClause.guid = req.query.guardianGuid
  }
  if (req.query.start) {
    if (!mainClasuse.measured_at) {
      mainClasuse.measured_at = {}
    }
    mainClasuse.measured_at[models.Sequelize.Op.gte] = req.query.start
  }
  if (req.query.end) {
    if (!mainClasuse.measured_at) {
      mainClasuse.measured_at = {}
    }
    mainClasuse.measured_at[models.Sequelize.Op.lte] = req.query.end
  }

  return models.GuardianAudio
    .findAll({
      where: mainClasuse,
      order,
      include: [
        {
          model: models.GuardianSite,
          as: 'Site',
          where: siteClause,
          attributes: ['guid', 'timezone', 'timezone_offset']
        },
        {
          model: models.Guardian,
          as: 'Guardian',
          where: guardianClause,
          attributes: ['guid']
        },
        {
          model: models.GuardianAudioFormat,
          as: 'Format',
          attributes: ['sample_rate']
        }
      ],
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    })
}

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return audioService.queryData(req)
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not find audio files.'))
  })

router.route('/filter')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const converter = new ApiConverter('audio', req)

    filter(req)
      .then(function (dbAudio) {
        return guardianAudioJson(dbAudio)
      })
      .then(function (audioJson) {
        const api = converter.cloneSequelizeToApi({ audios: audioJson })
        api.links.self = urls.getBaseUrl(req) + req.originalUrl
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.error('failed to return audios | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audios' }) }
      })
  })

router.route('/download/zip')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    // Not being used anymore
    res.sendStatus(501)
  })

router.route('/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [
          ...baseInclude
          // {
          //   model: models.GuardianCheckIn,
          //   as: 'CheckIn',
          //   attributes: ['guid']
          // }
        ]
      }).then(function (dbAudio) {
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      }).catch(function (err) {
        console.error('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

router.route('/nextafter/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function (dbAudio) {
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function (resolve) {
            return resolve(null)
          })
        } else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  [models.Sequelize.Op.gt]: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{ all: true }],
              limit: 1,
              order: [['measured_at', 'ASC']]
            })
        }
      })
      .then(function (dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpErrorResponse(req, res, 404, 'database')
        }
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      })
      .catch(function (err) {
        console.error('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

router.route('/prevbefore/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function (dbAudio) {
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function (resolve) {
            return resolve(null)
          })
        } else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  [models.Sequelize.Op.lt]: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{ all: true }],
              limit: 1,
              order: [['measured_at', 'DESC']]
            })
        }
      })
      .then(function (dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpErrorResponse(req, res, 404, 'database')
        }
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      })
      .catch(function (err) {
        console.error('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

module.exports = router
