const express = require('express')
const sequelize = require('sequelize')
const models = require('../../../models')
const httpError = require('../../../utils/http-errors.js')
const takeContentTypeFromFileExtMiddleware = require('../../../middleware/legacy/take-content-type-from-file-ext')
const ValidationError = require('../../../utils/converter/validation-error')
const reportsService = require('../../../services/reports/reports-service')
const attachmentService = require('../../../services/attachment/attachment-service')
const audioService = require('../../../services/audio/audio-service')
const { baseInclude, guardianAudioFile, guardianAudioSpectrogram, guardianAudioJson } = require('../../../views/v1/models/guardian-audio').models
const { guardianMetaScreenshotFile, guardianMetaScreenshots } = require('../../../views/v1/models/guardian-meta/guardian-meta-screenshots').models

const router = express.Router()
router.use(takeContentTypeFromFileExtMiddleware)

router.route('/audio/:audio_id')
  .get(function (req, res) {
    return models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: baseInclude
      }).then(function (dbAudio) {
        if (!dbAudio) {
          return res.status(404).json({ msg: 'Audio with given guid not found.' })
        }
        const audioFileExtensions = ['m4a', 'mp3', 'flac', 'opus', 'wav']
        if (audioFileExtensions.indexOf(req.rfcx.content_type) >= 0) {
          guardianAudioFile(req, res, dbAudio)
        } else if (req.rfcx.content_type === 'png') {
          guardianAudioSpectrogram(req, res, dbAudio)
        } else {
          guardianAudioJson(dbAudio)
            .then(function (audioJson) {
              res.status(200).json(audioJson)
            })
        }

        return null
      }).catch(function (err) {
        console.log('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

// TODO Remove when mobile app no longer calling /audio/amplitude/:audio_id endpoint
router.route('/audio/amplitude/:audio_id')
  .get(function (req, res) {
    const guid = req.params.audio_id
    const options = {
      where: { guid },
      include: [{ model: models.GuardianAudioFormat, as: 'Format', attributes: ['sample_rate'] }],
      attributes: ['capture_sample_count']
    }
    return models.GuardianAudio.findOne(options)
      .then(function (dbAudio) {
        if (!dbAudio) {
          return res.status(404).json({ msg: 'Audio with given guid not found.' })
        }
        const duration = 1000 * dbAudio.capture_sample_count / dbAudio.Format.sample_rate
        const numOfAmplitudes = Math.ceil(duration / 500)
        const values = randomAmplitudeArray(numOfAmplitudes, 0.003)
        res.json([{ guid, offset: 0, duration, amplitude: { window_duration: 500, type: 'rms', values } }])
      }).catch(function (err) {
        console.log('failed to return audio amplitude | ' + err)
        res.status(500).json({ msg: 'failed to return audio amplitude' })
      })
  })
function randomAmplitudeArray (length, max) {
  const arr = [...new Array(length)]
  arr.forEach((_val, index) => {
    if (index === 0) {
      arr[index] = Math.random() * max
    } else {
      const incrementFactor = Math.random() > 0.9 ? 0.5 : 0.1
      arr[index] = Math.abs(arr[index - 1] + ((Math.random() - 0.5) * max * incrementFactor))
      if (arr[index] > max) { arr[index] = 2 * max - arr[index] }
    }
  })
  return arr.map(val => Math.round(val * 1000000) / 1000000)
}

router.route('/screenshots/:screenshot_id')
  .get(function (req, res) {
    return models.GuardianMetaScreenShot
      .findOne({
        where: { guid: req.params.screenshot_id },
        include: [{ all: true }]
      }).then(function (dbScreenshot) {
        if (req.rfcx.content_type === 'png') {
          guardianMetaScreenshotFile(req, res, dbScreenshot)
        } else {
          res.status(200).json(guardianMetaScreenshots(req, res, dbScreenshot))
        }

        return null
      }).catch(function (err) {
        console.log('failed to return screenshot | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return screenshot' }) }
      })
  })

router.route('/report/audio/:guid').get(function (req, res) {
  return reportsService.getReportByGuid(req.params.guid)
    .then((dbReport) => {
      const filename = `${req.params.guid}.${req.rfcx.content_type}`
      const s3Bucket = process.env.ASSET_BUCKET_REPORT
      const s3Path = attachmentService.getS3PathForType('audio', dbReport.reported_at)
      return audioService.serveAudioFromS3(res, filename, s3Bucket, s3Path, !!req.query.inline)
    })
    .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    .catch(e => httpError(req, res, 500, e, e.message || 'Could not find report audio.'))
})

router.route('/attachments/:guid').get(function (req, res) {
  return attachmentService.getAttachmentByGuid(req.params.guid)
    .then((dbAttachment) => {
      const filename = `${req.params.guid}.${req.rfcx.content_type}`
      const s3Bucket = process.env.ASSET_BUCKET_ATTACHMENT
      const s3Path = attachmentService.getS3PathForType(dbAttachment.Type.type, dbAttachment.reported_at)
      return audioService.serveAudioFromS3(res, filename, s3Bucket, s3Path, !!req.query.inline)
    })
    .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    .catch(e => httpError(req, res, 500, e, e.message || 'Could not find report audio.'))
})

module.exports = router
