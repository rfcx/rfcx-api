const Promise = require('bluebird')
const exec = require('child_process').exec
const moment = require('moment-timezone')
const fs = require('fs')
const hash = require('../../../utils/misc/hash.js').hash
const token = require('../../../utils/internal-rfcx/token.js').token
const audioUtils = require('../../../utils/rfcx-audio').audioUtils
const assetUtils = require('../../../utils/internal-rfcx/asset-utils.js').assetUtils
const validation = require('../../../utils/misc/validation.js')

exports.models = {

  guardianAudioFile: function (req, res, dbRow) {
    const outputFileExtension = req.rfcx.content_type
    const outputFileName = dbRow.guid + '.' + outputFileExtension
    const isOutputEnhanced = (outputFileExtension === 'mp3')

    const clipDurationFull = (dbRow.capture_sample_count / dbRow.Format.sample_rate)
    const queryParams = parsePermittedQueryParams(req.query, clipDurationFull)

    // auto-generate the asset filepath if it's not stored in the url column
    const audioStorageUrl = (dbRow.url == null)
      ? 's3://' + process.env.ASSET_BUCKET_AUDIO + assetUtils.getGuardianAssetStoragePath('audio', dbRow.measured_at, dbRow.Guardian.guid, dbRow.Format.file_extension)
      : dbRow.url

    audioUtils.cacheSourceAudio(audioStorageUrl)
      .then(function ({ sourceFilePath }) {
        if ((dbRow.Format.file_extension === outputFileExtension) &&
            (Math.round(1000 * queryParams.clipDuration) / 1000 === Math.round(1000 * clipDurationFull) / 1000)) {
          console.log('serving ' + outputFileExtension + ' file without transcoding')
          audioUtils.serveAudioFromFile(res, sourceFilePath, outputFileName, audioUtils.formatSettings[outputFileExtension].mime, !!req.query.inline)
            .then(function () {
              // should we do/log anything if we're successful?
            }).catch(function (err) {
              console.log(err)
            })
        } else {
          console.log('transcoding ' + dbRow.Format.file_extension + ' audio to ' + outputFileExtension)

          audioUtils.transcodeToFile(outputFileExtension, {
            enhanced: isOutputEnhanced,
            bitRate: isOutputEnhanced ? '32k' : '16k',
            sampleRate: req.query.sampleRate ? parseInt(req.query.sampleRate) : dbRow.Format.sample_rate,
            clipOffset: queryParams.clipOffset,
            clipDuration: queryParams.clipDuration,
            copyCodecInsteadOfTranscode: (dbRow.Format.file_extension === outputFileExtension),
            sourceFilePath: sourceFilePath
          }).then(function (outputFilePath) {
            audioUtils.serveAudioFromFile(res, outputFilePath, outputFileName, audioUtils.formatSettings[outputFileExtension].mime, !!req.query.inline)
              .then(function () {
                // should we do/log anything if we're successful?
              }).catch(function (err) {
                console.log(err)
              })
          }).catch(function (err) {
            console.log(err)
          })
        }
      }).catch(function (err) {
        console.log(err)
        res.status(500).json({ msg: 'failed to download audio' })
      })
  },

  guardianAudioAmplitude: function (req, res, dbRow) {
    return new Promise(function (resolve, reject) {
      const queryParams = parsePermittedQueryParams(req.query, (dbRow.capture_sample_count / dbRow.Format.sample_rate))

      // auto-generate the asset filepath if it's not stored in the url column
      const audioStorageUrl = (dbRow.url == null)
        ? 's3://' + process.env.ASSET_BUCKET_AUDIO + assetUtils.getGuardianAssetStoragePath('audio', dbRow.measured_at, dbRow.Guardian.guid, dbRow.Format.file_extension)
        : dbRow.url

      audioUtils.cacheSourceAudio(audioStorageUrl)
        .then(function ({ sourceFilePath }) {
          audioUtils.transcodeToFile('wav', {
            enhanced: false,
            sampleRate: dbRow.Format.sample_rate,
            clipOffset: queryParams.clipOffset,
            clipDuration: queryParams.clipDuration,
            sourceFilePath: sourceFilePath
          }).then(function (outputFilePath) {
            const amplitudeType = 'RMS'

            let soxExec = ''

            for (let i = 0; i < (queryParams.clipDuration / queryParams.amplitudeWindowDuration); i++) {
              if (i > 0) { soxExec += ' && ' }
              soxExec += 'echo "$(' + process.env.SOX_PATH + ' ' + outputFilePath + ' -n trim ' + (queryParams.amplitudeWindowDuration * i) + ' ' + queryParams.amplitudeWindowDuration + ' stat 2>&1)"' +
                          ' | grep "' + amplitudeType + "\" | grep \"amplitude\" | cut -d':' -f 2 | sed -e 's/^[ \\t]*//'"
            }

            exec(soxExec, function (err, stdout, stderr) {
              if (stderr.trim().length > 0) { console.log(stderr) }
              if (err) { console.log(err) }
              fs.unlink(outputFilePath, function (e) { if (e) { console.log(e) } })

              const allStringAmplitudes = stdout.trim().split('\n')
              const allAmplitudes = []
              for (let i = 0; i < allStringAmplitudes.length; i++) {
                allAmplitudes.push(parseFloat(allStringAmplitudes[i]))
              }

              resolve([{
                guid: dbRow.guid,
                offset: Math.round(1000 * queryParams.clipOffset),
                duration: Math.round(1000 * queryParams.clipDuration),
                amplitude: {
                  window_duration: Math.round(1000 * queryParams.amplitudeWindowDuration),
                  type: amplitudeType.toLowerCase(),
                  values: allAmplitudes
                }
              }])
            })
          }).catch(function (err) {
            console.log(err)
            reject(new Error(err))
          })
        }).catch(function (err) {
          reject(new Error(err))
        })
    })
  },

  guardianAudioSpectrogram: function (req, res, dbRow) {
    const tmpFilePath = process.env.CACHE_DIRECTORY + 'ffmpeg/' + hash.randomString(32)

    const queryParams = parsePermittedQueryParams(req.query, (dbRow.capture_sample_count / dbRow.Format.sample_rate))

    // auto-generate the asset filepath if it's not stored in the url column
    const audioStorageUrl = (dbRow.url == null)
      ? 's3://' + process.env.ASSET_BUCKET_AUDIO + assetUtils.getGuardianAssetStoragePath('audio', dbRow.measured_at, dbRow.Guardian.guid, dbRow.Format.file_extension)
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
            console.log(stderr)
          }
          if (err) {
            console.log(err)
          }

          fs.unlink(sourceFilePath, function (e) { if (e) { console.log(e) } })
          fs.unlink(tmpFilePath + '-sox.png', function (e) { if (e) { console.log(e) } })
          fs.unlink(tmpFilePath + '-rotated.png', function (e) { if (e) { console.log(e) } })

          audioUtils.serveAudioFromFile(res, tmpFilePath + '-final.png', dbRow.guid + '.png', 'image/png', !!req.query.inline)
            .then(function () {
              // should we do/log anything if we're successful?
            }).catch(function (err) {
              console.log(err)
            })
        })
      }).catch(function (err) {
        console.log(err)
        res.status(500).json({ msg: 'failed to download audio' })
      })
  },

  guardianAudioJson: function (req, res, dbRows, PARENT_GUID) {
    if (!Array.isArray(dbRows)) {
      dbRows = [dbRows]
    }

    return new Promise(function (resolve, reject) {
      if (!dbRows.length) {
        resolve([])
      }

      const proms = []
      const jsonArr = []

      dbRows.forEach((thisRow) => {
        const guid = thisRow.guid

        const prom = token.createAnonymousToken({
          reference_tag: guid,
          token_type: 'audio-file',
          minutes_until_expiration: 30,
          created_by: null,
          allow_garbage_collection: true,
          only_allow_access_to: [
            `^/v1/assets/audio/${guid}.m4a$`,
            `^/v1/assets/audio/${guid}.mp3$`,
            `^/v1/assets/audio/${guid}.opus$`,
            `^/v1/assets/audio/${guid}.png$`
          ]
        })

        proms.push(prom)
      })

      Promise.all(proms)
        .then((tokens) => {
          tokens.forEach((token, index) => {
            const thisRow = dbRows[index]
            const json = {
              guid: thisRow.guid,
              measured_at: thisRow.measured_at,
              analyzed_at: thisRow.analyzed_at,
              size: thisRow.size,
              duration: null,
              sample_rate: thisRow.Format ? thisRow.Format.sample_rate : null,
              sha1_checksum: thisRow.sha1_checksum,
              original_filename: thisRow.original_filename
            }
            if (thisRow.Format) {
              json.duration = Math.round(1000 * thisRow.capture_sample_count / thisRow.Format.sample_rate)
            }
            if (thisRow.Site) {
              json.site_guid = thisRow.Site.guid
              json.timezone_offset = thisRow.Site.timezone_offset
              json.timezone = thisRow.Site.timezone
            }
            if (thisRow.Guardian) {
              json.guardian_guid = thisRow.Guardian.guid
            }
            if (thisRow.CheckIn) {
              json.checkin_guid = thisRow.CheckIn.guid
            }
            if (PARENT_GUID) {
              json.PARENT_GUID = PARENT_GUID
            }

            const urlBase = `${process.env.ASSET_URLBASE}/audio/${thisRow.guid}`
            json.urls = {
              m4a: `${urlBase}.m4a`,
              mp3: `${urlBase}.mp3`,
              opus: `${urlBase}.opus`,
              png: `${urlBase}.png`
            }

            json.urls_expire_at = token.token_expires_at

            jsonArr.push(json)
          })

          resolve(jsonArr)
        })
        .catch((err) => {
          console.log('failed to create anonymous token | ' + err)
          reject(new Error(err))
        })
    })
  },
  guardianAudioLabels: function (req, res, labels) {
    return new Promise(function (resolve, reject) {
      if (labels == null || !Array.isArray(labels) || labels.length === 0) {
        reject(new Error('The returned labels were fewer than 1'))
      }

      let last = -2000
      const expectedLength = 2000

      for (let i = 0; i < labels.length; i++) {
        const current = labels[i].begins_at
        const length = current - last
        if (length !== expectedLength) {
          reject(new Error('The length of windows should be two thousand miliseconds but was ' + length))
        }
        last = current
      }

      const labelValues = labels.map(function (label) {
        return label.label
      })

      resolve(labelValues)
    })
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

  // Amplitude Analysis Customization Parameters

  let amplitudeWindowDuration = (queryParams.window_duration == null) ? 500 : parseInt(queryParams.window_duration)
  if ([250, 500, 1000, 2000].indexOf(amplitudeWindowDuration) < 0) { amplitudeWindowDuration = 500 }

  // Audio Clipping Parameters

  let clipOffset = (queryParams.offset == null) ? 0 : (parseInt(queryParams.offset) / 1000)
  if (clipOffset > clipDurationFull) { clipOffset = 0 } else if (clipOffset < 0) { clipOffset = 0 }

  let clipDuration = (queryParams.duration == null) ? clipDurationFull : (parseInt(queryParams.duration) / 1000)
  if ((clipOffset + clipDuration) > clipDurationFull) { clipDuration = (clipDurationFull - clipOffset) } else if (clipDuration < 0) { clipDuration = (clipDurationFull - clipOffset) }

  return {
    specWidth: specWidth,
    specHeight: specHeight,
    specRotate: specRotate,
    specZaxis: specZaxis,
    specWindowFunc: specWindowFunc.substr(0, 1).toUpperCase() + specWindowFunc.substr(1),
    amplitudeWindowDuration: amplitudeWindowDuration / 1000,
    clipOffset: clipOffset,
    clipDuration: clipDuration
  }
}
