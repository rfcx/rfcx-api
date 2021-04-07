const models = require('../../../models')
const express = require('express')
const router = express.Router()
const httpError = require('../../../utils/http-errors.js')
const assetUtils = require('../../../utils/internal-rfcx/asset-utils.js').assetUtils
const passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)

const analysisUtils = require('../../../utils/rfcx-analysis/analysis-queue.js').analysisUtils

function processAudios (req, res, dbAudio, audioGuids, modelGuid) {
  if (dbAudio.length < 1) {
    httpError(req, res, 404, null, 'No audios found')
    return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
  } else {
    if (!Array.isArray(dbAudio)) { dbAudio = [dbAudio] }
    const batch = []
    for (const i in dbAudio) {
      batch.push({
        audio_guid: dbAudio[i].guid,
        api_url_domain: req.rfcx.api_url_domain,
        audio_sha1_checksum: dbAudio[i].sha1_checksum,
        audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
        audio_s3_path:
          // auto-generate the asset filepath if it's not stored in the url column
          (dbAudio[i].url == null)
            ? assetUtils.getGuardianAssetStoragePath('audio', dbAudio[i].measured_at, dbAudio[i].Guardian.guid, dbAudio[i].Format.file_extension)
            : dbAudio[i].url.substr(dbAudio[i].url.indexOf('://') + 3 + process.env.ASSET_BUCKET_AUDIO.length)
      })
      audioGuids.push(dbAudio[i].guid)
    }
    return analysisUtils.batchQueueAudioForAnalysis(process.env.SQS_PERCEPTION_BATCH, modelGuid, batch)
  }
}

router.route('/:guardian_id/audio/analysis')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      })
      .then(function (dbGuardian) {
        const dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : 'DESC'

        const dbQuery = {
          site_id: dbGuardian.site_id,
          guardian_id: dbGuardian.id,
          format_id: { [models.Sequelize.Op.not]: null }
        }
        const dateClmn = 'measured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gte] = req.rfcx.starting_after }

        const createdClmn = 'created_at'
        if ((req.query.created_before != null) || (req.query.created_after != null)) {
          dbQuery[createdClmn] = {}
        }
        if (req.query.created_before != null) {
          dbQuery[createdClmn][models.Sequelize.Op.lt] = req.query.created_before
        }
        if (req.query.created_after != null) {
          dbQuery[createdClmn][models.Sequelize.Op.gte] = req.query.created_after
        }

        if (req.query.manual_upload) {
          dbQuery.check_in_id = null
        }

        const modelGuid = req.query.model_id
        const audioGuids = []

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            include: [
              {
                model: models.Guardian,
                as: 'Guardian',
                attributes: ['guid']
              },
              {
                model: models.GuardianAudioFormat,
                as: 'Format',
                attributes: ['file_extension']
              }
            ],
            order: [[dateClmn, dbQueryOrder]],
            limit: 140000, // req.rfcx.limit,
            offset: req.rfcx.offset
          })
          .then(function (dbAudio) {
            return processAudios(req, res, dbAudio, audioGuids, modelGuid)
          })
          .then(function () {
            res.status(200).json({
              queued_count: audioGuids.length
            })
          })
          .catch(function (err) {
            console.log('failed to requeue audio | ', err)
            if (err) { res.status(500).json({ msg: 'failed to requeue audio' }) }
          })
      })
      .catch(function (err) {
        console.log('failed to find guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to find guardian' }) }
      })
  })

router.route('/sites/:site_id/audio/analysis')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      })
      .then(function (dbSite) {
        const dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : 'DESC'

        const dbQuery = { site_id: dbSite.id }
        const dateClmn = 'measured_at'
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {} }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn][models.Sequelize.Op.lt] = req.rfcx.ending_before }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn][models.Sequelize.Op.gte] = req.rfcx.starting_after }

        const createdClmn = 'created_at'
        if ((req.query.created_before != null) || (req.query.created_after != null)) {
          dbQuery[createdClmn] = {}
        }
        if (req.query.created_before != null) {
          dbQuery[createdClmn][models.Sequelize.Op.lt] = req.query.created_before
        }
        if (req.query.created_after != null) {
          dbQuery[createdClmn][models.Sequelize.Op.gte] = req.query.created_after
        }

        if (req.query.manual_upload) {
          dbQuery.check_in_id = null
        }

        const modelGuid = req.query.model_id
        const audioGuids = []

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            include: [{ all: true }],
            order: [[dateClmn, dbQueryOrder]],
            limit: 140000, // req.rfcx.limit,
            offset: req.rfcx.offset
          })
          .then(function (dbAudio) {
            return processAudios(req, res, dbAudio, audioGuids, modelGuid)
          })
          .then(function () {
            res.status(200).json({
              queued_count: audioGuids.length
            })
          })
          .catch(function (err) {
            console.log('failed to requeue audio | ', err)
            if (err) { res.status(500).json({ msg: 'failed to requeue audio' }) }
          })
      })
      .catch(function (err) {
        console.log('failed to find site | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to find site' }) }
      })
  })

router.route('/audio/analysis')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    const audioGuids = []
    return models.GuardianAudio
      .findAll({
        where: { guid: { [models.Sequelize.Op.in]: req.body.guids } },
        include: [{ all: true }],
        limit: 140000
      })
      .then(function (dbAudio) {
        return processAudios(req, res, dbAudio, audioGuids)
      })
      .then(function () {
        res.status(200).json(audioGuids)
      })
      .catch(function (err) {
        console.log('failed to requeue audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to requeue audio' }) }
      })
  })

module.exports = router
