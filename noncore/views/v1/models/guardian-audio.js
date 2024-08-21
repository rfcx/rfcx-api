const Promise = require('bluebird')
const exec = require('child_process').exec
const moment = require('moment-timezone')
const fs = require('fs')
const random = require('../../../../common/crypto/random')
const audioUtils = require('../../../_utils/rfcx-audio').audioUtils
const validation = require('../../../_utils/misc/validation')
const { GuardianSite, Guardian, GuardianAudioFormat, StreamSegment } = require('../../../_models')

exports.models = {

  baseInclude: [
    {
      model: GuardianSite,
      as: 'Site',
      attributes: ['guid', 'name', 'timezone', 'timezone_offset']
    },
    {
      model: Guardian,
      as: 'Guardian',
      attributes: ['guid', 'shortname', 'stream_id']
    },
    {
      model: GuardianAudioFormat,
      as: 'Format',
      attributes: ['sample_rate', 'file_extension']
    }
  ],

  guardianAudioFile: async function (req, res, dbRow) {
    const outputFileExtension = req.rfcx.content_type
    const outputFileName = dbRow.guid + '.' + outputFileExtension
    const isOutputEnhanced = (outputFileExtension === 'mp3')

    const clipDurationFull = (dbRow.capture_sample_count / dbRow.Format.sample_rate)
    const queryParams = parsePermittedQueryParams(req.query, clipDurationFull)

    // auto-generate the asset filepath if it's not stored in the url column
    const segment = await StreamSegment.findOne({ where: { stream_id: dbRow.Guardian.stream_id, start: dbRow.measured_at } })
    if (!segment) {
      res.status(404).json({ msg: 'Recording not found' })
    }
    const dateTimeString = dbRow.measured_at.toISOString().substr(0, 19).replace(/:/g, '-')
    const audioPath = `/${dateTimeString.substr(0, 4)}/${dateTimeString.substr(5, 2)}/${dateTimeString.substr(8, 2)}/${dbRow.Guardian.stream_id}/${segment.id}.${dbRow.Format.file_extension}`
    const audioStorageUrl = (dbRow.url == null)
      ? 's3://' + process.env.INGEST_BUCKET + audioPath
      : dbRow.url
    console.info(audioStorageUrl)
    audioUtils.cacheSourceAudio(audioStorageUrl)
      .then(function ({ sourceFilePath }) {
        if ((dbRow.Format.file_extension === outputFileExtension) &&
          (Math.round(1000 * queryParams.clipDuration) / 1000 === Math.round(1000 * clipDurationFull) / 1000)) {
          console.info('serving ' + outputFileExtension + ' file without transcoding')
          audioUtils.serveAudioFromFile(res, sourceFilePath, outputFileName, audioUtils.formatSettings[outputFileExtension].mime, !!req.query.inline)
            .then(function () {
              // should we do/log anything if we're successful?
            }).catch(function (err) {
              console.error(err)
            })
        } else {
          console.info('transcoding ' + dbRow.Format.file_extension + ' audio to ' + outputFileExtension)

          audioUtils.transcodeToFile(outputFileExtension, {
            enhanced: isOutputEnhanced,
            bitRate: isOutputEnhanced ? '32k' : '16k',
            sampleRate: req.query.sampleRate ? parseInt(req.query.sampleRate) : dbRow.Format.sample_rate,
            clipOffset: queryParams.clipOffset,
            clipDuration: queryParams.clipDuration,
            copyCodecInsteadOfTranscode: (dbRow.Format.file_extension === outputFileExtension),
            sourceFilePath
          }).then(function (outputFilePath) {
            audioUtils.serveAudioFromFile(res, outputFilePath, outputFileName, audioUtils.formatSettings[outputFileExtension].mime, !!req.query.inline)
              .then(function () {
                // should we do/log anything if we're successful?
              }).catch(function (err) {
                console.error(err)
              })
          }).catch(function (err) {
            console.error(err)
          })
        }
      }).catch(function (err) {
        console.error(err)
        res.status(500).json({ msg: 'failed to download audio' })
      })
  },

  guardianAudioSpectrogram: async function (req, res, dbRow) {
    const tmpFilePath = process.env.CACHE_DIRECTORY + 'ffmpeg/' + random.randomString(32)

    const queryParams = parsePermittedQueryParams(req.query, (dbRow.capture_sample_count / dbRow.Format.sample_rate))

    // auto-generate the asset filepath if it's not stored in the url column
    const segment = await StreamSegment.findOne({ where: { stream_id: dbRow.Guardian.stream_id, start: dbRow.measured_at } })
    if (!segment) {
      res.status(404).json({ msg: 'Recording not found' })
    }
    const dateTimeString = dbRow.measured_at.toISOString().substr(0, 19).replace(/:/g, '-')
    const audioPath = `/${dateTimeString.substr(0, 4)}/${dateTimeString.substr(5, 2)}/${dateTimeString.substr(8, 2)}/${dbRow.Guardian.stream_id}/${segment.id}.${dbRow.Format.file_extension}`
    const audioStorageUrl = (dbRow.url == null)
      ? 's3://' + process.env.INGEST_BUCKET + audioPath
      : dbRow.url

    audioUtils.cacheSourceAudio(audioStorageUrl)
      .then(function ({ sourceFilePath }) {
        const ffmpegSox =
          process.env.FFMPEG_PATH +
          ' -i ' + sourceFilePath + ' -loglevel panic -nostdin' +
          ' -ac 1 -ar ' + dbRow.Format.sample_rate +
          ' -ss ' + queryParams.clipOffset + ' -t ' + queryParams.clipDuration +
          ' -f sox - ' +
          ' | ' + process.env.SOX_PATH +
          ' -t sox - -n spectrogram -h -r' +
          ' -o ' + tmpFilePath + '-sox.png' +
          ' -x ' + queryParams.specWidth + ' -y ' + queryParams.specHeight +
          ' -w ' + queryParams.specWindowFunc + ' -z ' + queryParams.specZaxis + ' -s' +
          ' -d ' + queryParams.clipDuration

        const imageMagick = ((queryParams.specRotate === 0) || (process.env.IMAGEMAGICK_PATH == null))
          ? `cp ${tmpFilePath}-sox.png ${tmpFilePath}-rotated.png`
          : `${process.env.IMAGEMAGICK_PATH} ${tmpFilePath}-sox.png -rotate ${queryParams.specRotate} ${tmpFilePath}-rotated.png`

        const pngCrush = (process.env.PNGCRUSH_PATH == null)
          ? `cp ${tmpFilePath}-rotated.png ${tmpFilePath}-final.png`
          : `${process.env.PNGCRUSH_PATH} ${tmpFilePath}-rotated.png ${tmpFilePath}-final.png`

        exec(ffmpegSox + ' && ' + imageMagick + ' && ' + pngCrush, function (err, stdout, stderr) {
          if (stderr.trim().length > 0) {
            console.error({ stderr })
          }
          if (err) {
            console.error({ err })
          }

          fs.unlink(sourceFilePath, function (e) { if (e) { console.error(e) } })
          fs.unlink(tmpFilePath + '-sox.png', function (e) { if (e) { console.error(e) } })
          fs.unlink(tmpFilePath + '-rotated.png', function (e) { if (e) { console.error(e) } })

          audioUtils.serveAudioFromFile(res, tmpFilePath + '-final.png', dbRow.guid + '.png', 'image/png', !!req.query.inline)
            .catch(function (err) {
              console.error(err)
            })
        })
      }).catch(function (err) {
        console.error(err)
        res.status(500).json({ msg: 'failed to download audio' })
      })
  },

  guardianAudioJson: function (audios, parentGuid) {
    if (!Array.isArray(audios)) {
      audios = [audios]
    }
    const data = audios.map((audio) => {
      const json = {
        guid: audio.guid,
        measured_at: audio.measured_at,
        analyzed_at: audio.analyzed_at,
        size: audio.size,
        duration: null,
        sample_rate: audio.Format ? audio.Format.sample_rate : null,
        sha1_checksum: audio.sha1_checksum,
        original_filename: audio.original_filename
      }
      if (audio.Format) {
        json.duration = Math.round(1000 * audio.capture_sample_count / audio.Format.sample_rate)
      }
      if (audio.Site) {
        json.site_guid = audio.Site.guid
        json.timezone_offset = audio.Site.timezone_offset
        json.timezone = audio.Site.timezone
      }
      if (audio.Guardian) {
        json.guardian_guid = audio.Guardian.guid
      }
      if (audio.CheckIn) {
        json.checkin_guid = audio.CheckIn.guid
      }
      if (parentGuid) {
        json.PARENT_GUID = parentGuid
      }

      const urlBase = `${process.env.ASSET_URLBASE}/audio/${audio.guid}`
      json.urls = {
        m4a: `${urlBase}.m4a`,
        mp3: `${urlBase}.mp3`,
        opus: `${urlBase}.opus`,
        png: `${urlBase}.png`
      }
      return json
    })
    return Promise.resolve(data)
  },

  transformCreateAudioRequestToModel: function (reqObj) {
    return Promise.resolve().then(function () {
      const requiredAttributes = ['site_id', 'guardian_id', 'measured_at', 'size', 'sha1_checksum', 'format_id', 'capture_sample_count']
      validation.assertAttributesExist(reqObj, requiredAttributes)

      console.info('assertions correct')

      // default
      const modelObj = {}

      // copy attributes to make sure that the request doesn't set columns we don't want it to set
      for (let i = 0; i < requiredAttributes.length; i++) {
        const attr = requiredAttributes[i]
        modelObj[attr] = reqObj[attr]
      }

      modelObj.measured_at_local = moment.tz(reqObj.measured_at, (reqObj.timezone || 'UTC')).format('YYYY-MM-DDTHH:mm:ss.SSS')

      return modelObj
    })
  }

}

function parsePermittedQueryParams (queryParams, clipDurationFull) {
  // Spectrogram Image Dimensions & Rotation

  let specWidth = (queryParams.width == null) ? 2048 : parseInt(queryParams.width)
  if (specWidth > 4096) { specWidth = 4096 } else if (specWidth < 1) { specWidth = 1 }

  let specHeight = (queryParams.height == null) ? 512 : parseInt(queryParams.height)
  if (specHeight > 1024) { specHeight = 1024 } else if (specHeight < 1) { specHeight = 1 }

  let specRotate = (queryParams.rotate == null) ? 0 : parseInt(queryParams.rotate)
  if ((specRotate !== 90) && (specRotate !== 180) && (specRotate !== 270)) { specRotate = 0 }

  // Spectrogram SOX Customization Parameters

  let specZaxis = (queryParams.z_axis == null) ? 95 : parseInt(queryParams.z_axis)
  if (specZaxis > 180) { specZaxis = 180 } else if (specZaxis < 20) { specZaxis = 20 }

  let specWindowFunc = (queryParams.window_function == null) ? 'dolph' : queryParams.window_function.trim().toLowerCase()
  if (['dolph', 'hann', 'hamming', 'bartlett', 'rectangular', 'kaiser'].indexOf(specWindowFunc) < 0) { specWindowFunc = 'dolph' }

  // Audio Clipping Parameters

  let clipOffset = (queryParams.offset == null) ? 0 : (parseInt(queryParams.offset) / 1000)
  if (clipOffset > clipDurationFull) { clipOffset = 0 } else if (clipOffset < 0) { clipOffset = 0 }

  let clipDuration = (queryParams.duration == null) ? clipDurationFull : (parseInt(queryParams.duration) / 1000)
  if ((clipOffset + clipDuration) > clipDurationFull) { clipDuration = (clipDurationFull - clipOffset) } else if (clipDuration < 0) { clipDuration = (clipDurationFull - clipOffset) }

  return {
    specWidth,
    specHeight,
    specRotate,
    specZaxis,
    specWindowFunc: specWindowFunc.substr(0, 1).toUpperCase() + specWindowFunc.substr(1),
    clipOffset,
    clipDuration
  }
}
