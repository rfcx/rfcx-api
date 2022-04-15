const express = require('express')
const models = require('../../_models')
const takeContentTypeFromFileExtMiddleware = require('../../../common/middleware/legacy/take-content-type-from-file-ext')
const { baseInclude, guardianAudioFile, guardianAudioSpectrogram, guardianAudioJson } = require('../../views/v1/models/guardian-audio').models
const { guardianMetaScreenshotFile, guardianMetaScreenshots } = require('../../views/v1/models/guardian-meta/guardian-meta-screenshots').models

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
        console.error('failed to return audio | ' + err)
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
        console.error('failed to return audio amplitude | ' + err)
        res.status(500).json({ msg: 'failed to return audio amplitude' })
      })
  })
// TODO Remove with above route handler when no longer needed
function randomAmplitudeArray (length, max) {
  // Create a random array of doubles less than max but keep the difference between consequetive values
  // to be less than 10% of max 90% of the time (the other 10% of the time, allow sudden changes in values)
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
        console.error('failed to return screenshot | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return screenshot' }) }
      })
  })

module.exports = router
