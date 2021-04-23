const { runExec } = require('../../utils/misc/shell')
const models = require('../../modelsTimescale')
const Promise = require('bluebird')
const path = require('path')
const moment = require('moment-timezone')
const ValidationError = require('../../utils/converter/validation-error')
const audioUtils = require('../../utils/rfcx-audio').audioUtils
const assetUtils = require('../../utils/internal-rfcx/asset-utils.js').assetUtils
const mathUtil = require('../../utils/misc/math')
const hash = require('../../utils/misc/hash')
const storageService = process.env.PLATFORM === 'google' ? require('../storage/google') : require('../storage/amazon')

const possibleWindowFuncs = ['dolph', 'hann', 'hamming', 'bartlett', 'rectangular', 'kaiser']
const possibleExtensions = ['png', 'jpeg', 'wav', 'opus', 'flac', 'mp3']
const possibleFileTypes = ['spec', 'wav', 'opus', 'flac', 'mp3']
const possibleAudioFileTypes = ['wav', 'opus', 'flac', 'mp3']

const INGEST_BUCKET = process.env.INGEST_BUCKET
const MEDIA_CACHE_ENABLED = `${process.env.MEDIA_CACHE_ENABLED}` === 'true'
const STREAMS_CACHE_BUCKET = process.env.STREAMS_CACHE_BUCKET
const CACHE_DIRECTORY = process.env.CACHE_DIRECTORY
const FFMPEG_PATH = process.env.FFMPEG_PATH
const SOX_PATH = process.env.SOX_PATH
const IMAGEMAGICK_PATH = process.env.IMAGEMAGICK_PATH

function parseFileNameAttrs (req) {
  return new Promise((resolve, reject) => {
    const name = req.params.attrs
    if (!name) {
      reject(new ValidationError('File parameters must be specified in the url.'))
      return
    }
    const nameArr = name.split('_')
    if (!nameArr || !nameArr.length) {
      reject(new ValidationError('File parameters are empty.'))
      return
    }
    function findStartsWith (symb) {
      const item = nameArr.find((item, index) => {
        return index !== 0 && item.startsWith(symb)
      })
      return item ? item.slice(symb.length) : undefined
    }
    const dimensionsStr = findStartsWith('d')
    const timeStr = findStartsWith('t')
    const clipStr = findStartsWith('r')
    resolve({
      streamId: nameArr[0],
      time: timeStr
        ? {
            starts: timeStr.split('.')[0],
            ends: timeStr.split('.')[1]
          }
        : undefined,
      clip: clipStr && clipStr !== 'full'
        ? {
            bottom: clipStr.split('.')[0],
            top: clipStr.split('.')[1]
          }
        : 'full',
      gain: findStartsWith('g') || '1',
      fileType: findStartsWith('f'),
      dimensions: dimensionsStr
        ? {
            x: dimensionsStr.split('.')[0],
            y: dimensionsStr.split('.')[1]
          }
        : undefined,
      windowFunc: findStartsWith('w') || 'dolph',
      monochrome: findStartsWith('m') || 'false',
      zAxis: findStartsWith('z') || '120',
      jpegCompression: findStartsWith('c') || 0
      // sampleRate: findStartsWith('sr'),
    })
  })
}

function checkAttrsValidity (req, attrs) {
  if (!attrs.streamId) {
    throw (new ValidationError('Stream id is required.'))
  }
  if (!attrs.fileType) {
    throw new ValidationError('"f" (file type) attribute is required.')
  }
  if (!attrs.time || !attrs.time.starts || !attrs.time.ends) {
    throw new ValidationError('"t" (time) attribute is required and should have the following format: "t20190907T004303000Z.20190907T005205000Z".')
  }
  if (!possibleExtensions.includes(req.rfcx.content_type)) {
    throw new ValidationError(`Unsupported file extension. Possible values: ${possibleExtensions.join(', ')}`)
  }
  if ((moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')).diff((moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')), 'minutes') > 15) {
    throw new ValidationError('Maximum range between start and end should be less than 15 minutes.')
  }
  if (attrs.fileType === 'spec' && (req.rfcx.content_type !== 'png' && req.rfcx.content_type !== 'jpeg')) {
    throw new ValidationError('Unsupported file extension. Only png or jpeg are available for type spec')
  }
  if (possibleAudioFileTypes.includes(attrs.fileType) && req.rfcx.content_type !== attrs.fileType) {
    throw new ValidationError('Invalid file extension. File type and file extension should match.')
  }
  if (attrs.fileType === 'spec' && (!attrs.dimensions || !attrs.dimensions.x || !attrs.dimensions.y)) {
    throw new ValidationError('"d" (dimensions) attribute is required and should have the following format: d100.200.')
  }
  if (attrs.fileType === 'spec' && attrs.windowFunc && !possibleWindowFuncs.includes(attrs.windowFunc)) {
    throw new ValidationError(`"w" unsupported window function. Possible values: ${possibleWindowFuncs.join(', ')}.`)
  }
  if (!possibleFileTypes.includes(attrs.fileType)) {
    throw new ValidationError(`"f" unsupported file type. Possible values: ${possibleFileTypes.join(', ')}.`)
  }
  if (parseInt(attrs.zAxis) < 20 || parseInt(attrs.zAxis) > 180) {
    throw new ValidationError('"z" may range from 20 to 180.')
  }
  if (isNaN(parseFloat(attrs.gain))) {
    throw new ValidationError('"g" should be float value and be greater or equal to 0')
  }
  return true
}

async function getFile (req, res, attrs, segments, nextTimestamp) {
  const filename = combineStandardFilename(attrs, req)
  const extension = attrs.fileType === 'spec' ? 'wav' : attrs.fileType

  const audioFilename = `${filename}.${extension}`
  const spectrogramFilename = `${filename}.png`

  const storageAudioFilePath = `${attrs.streamId}/audio/${audioFilename}`
  const storagespecFilePath = `${attrs.streamId}/image/${spectrogramFilename}`

  const storageFilePath = attrs.fileType === 'spec' ? storagespecFilePath : storageAudioFilePath

  const additionalHeaders = {
    'Access-Control-Expose-Headers': 'RFCx-Stream-Next-Timestamp, RFCx-Stream-Gaps',
    'RFCx-Stream-Gaps': getGapsForFile(attrs, segments)
  }
  if (nextTimestamp) {
    additionalHeaders['RFCx-Stream-Next-Timestamp'] = nextTimestamp
  }

  const getFromCache = MEDIA_CACHE_ENABLED ? await storageService.exists(STREAMS_CACHE_BUCKET, storageFilePath) : false
  if (getFromCache) {
    res.attachment(attrs.fileType === 'spec' ? spectrogramFilename : audioFilename)
    for (const key in additionalHeaders) {
      res.setHeader(key, additionalHeaders[key])
    }
    return storageService.getReadStream(STREAMS_CACHE_BUCKET, storageFilePath).pipe(res)
  } else {
    return generateFile(req, res, attrs, segments, additionalHeaders)
  }
}

function getGapsForFile (attrs, segments) {
  const gaps = []
  const starts = moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf()
  const ends = moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf()
  segments.forEach((segment, ind) => {
    if (ind === 0 && starts < segment.start) {
      gaps.push([starts, segment.start])
    }
    if ((ind + 1) <= (segments.length - 1)) {
      const nextSegment = segments[ind + 1]
      if (nextSegment.start > segment.end) {
        gaps.push([segment.end, nextSegment.start])
      }
    }
    if ((ind === segments.length - 1) && segment.end < ends) {
      gaps.push([segment.end, ends])
    }
  })
  return gaps
}

function getSoxFriendlyHeight (y) {
  // From Sox docs:
  // "−y" can be slow to produce the spectrogram if this number is not one more than a power of two (e.g. 129).
  // So we will raise spectrogram height to nearest power of two and then resize image back to requested height
  return mathUtil.isPowerOfTwo(y - 1) ? y : (mathUtil.ceilPowerOfTwo(y) + 1)
}

function downloadSegments (segments) {
  const downloadProms = []
  for (const segment of segments) {
    const ts = moment.tz(segment.start, 'UTC')
    const segmentExtension = segment.file_extension && segment.file_extension.value
      ? segment.file_extension.value
      : path.extname(segment.stream_source_file.filename)
    const remotePath = `${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.stream_id}/${segment.id}${segmentExtension}`
    segment.sourceFilePath = `${CACHE_DIRECTORY}ffmpeg/${hash.randomString(32)}${segmentExtension}`
    downloadProms.push(storageService.download(INGEST_BUCKET, remotePath, segment.sourceFilePath))
  }
  return Promise.all(downloadProms)
}

function convertAudio (segments, starts, ends, attrs, outputPath) {
  let command = `${FFMPEG_PATH} `
  const complexFilter = []
  segments.forEach((segment, ind) => {
    let startSilsenceMs
    if (ind === 0 && starts < segment.start) {
      // when requested time range starts earlier than first segment
      // add empty sound at the start
      startSilsenceMs = segment.start - starts
    }
    let endSilenceMs = 0
    const nextSegment = segments[ind + 1]
    if (ind < (segments.length - 1) && nextSegment && (nextSegment.start - segment.end) > 0) {
      // when there is a gap between current and next segment
      // add empty sound at the end of current segment
      endSilenceMs = nextSegment.start - segment.end
    }
    if (ind === (segments.length - 1) && ends > segment.end) {
      // when requested time range ends later than last segment
      // add empty sound at the end
      endSilenceMs = ends - segment.end
    }
    let seekMs = 0
    if (ind === 0 && starts > segment.start) {
      // when requested time range starts later than first segment
      // cut first segment at the start
      seekMs = starts - segment.start
    }
    let durationMs
    const segmentDuration = segment.end - segment.start
    if (ind < (segments.length - 1) && nextSegment && (nextSegment.start - segment.end) < 0) {
      // when there is an overlap between current and next segment
      // trim current segment
      durationMs = segmentDuration - seekMs - (segment.end - nextSegment.start)
    }
    if (ind === (segments.length - 1) && ends < segment.end) {
      // when requested time range ends earlier than last segment
      // cut last segment at the end
      durationMs = segmentDuration - seekMs - (segment.end - ends)
    }
    if (seekMs) {
      if (seekMs > segmentDuration) {
        seekMs = segmentDuration
      }
      command += `-ss ${seekMs}ms ` // how many ms we should skip
    }
    if (durationMs < 0) {
      durationMs = 0
    }
    if (durationMs !== undefined) {
      command += `-t ${durationMs}ms ` // how much time in duration we should have
    }
    command += `-i ${segment.sourceFilePath} `
    let sampleRate
    try {
      sampleRate = segment.stream_source_file.sample_rate
    } catch (e) {
      console.error(`Could not get sampleRate for segment "${segment.id}"`)
    }
    // We specify segment index for ffmpeg filter
    // [0:a] means: get audio from 0 segment, [1:a] means audio from 1 segment, etc
    let filterInputId = `[${ind}:a]`
    // Filter output id could be any string. We set it equal to input id for case when no filter will be applied
    let filterOutputId = filterInputId
    if (sampleRate) {
      filterOutputId = `[${ind}resampled]` // change output id to [0resampled] or [1resampled], etc...
      complexFilter.push(`${filterInputId}aresample=${sampleRate}${filterOutputId}`)
      filterInputId = filterOutputId // if there will be next filter, it will get output id which we have just set (e.g. [0resampled])
    }
    if (startSilsenceMs) {
      filterOutputId = `[${ind}delayed]`
      complexFilter.push(`${filterInputId}adelay=${startSilsenceMs}ms${filterOutputId}`)
      filterInputId = filterOutputId
    }
    if (endSilenceMs) {
      filterOutputId = `[${ind}padded]`
      complexFilter.push(`${filterInputId}apad=pad_dur=${endSilenceMs / 1000}${filterOutputId}`)
    }
    segment.filterOutputId = filterOutputId // this id will be used in "concat" filter
  })
  // see https://ffmpeg.org/ffmpeg-filters.html#Filtergraph-description to learn filter syntax
  command += `-filter_complex "${complexFilter.length ? complexFilter.join(';') + ';' : ''}${segments.map(s => s.filterOutputId).join('')}concat=n=${segments.length}:v=0:a=1`
  if (attrs.gain !== undefined && parseFloat(attrs.gain) !== 1) {
    command += `,volume=${attrs.gain}`
  }
  command += `" -y -vn -ac 1 ${outputPath}` // double quote closes filter_complex; -y === "overwrite output files"; -vn === "disable video"; -ac 1 - single audio channel
  return runExec(command)
}

function makeSpectrogram (sourcePath, outputPath, attrs) {
  return runExec(`${SOX_PATH} ${sourcePath} -n spectrogram -r ${attrs.monochrome === 'true' ? '-lm' : '-h'} -o  ${outputPath} -x ${attrs.dimensions.x} -y ${attrs.soxFriendlyHeight} -w ${attrs.windowFunc} -z ${attrs.zAxis} -s`)
}

function resizeSpectrogram (sourcePath, dimensions) {
  return runExec(`${IMAGEMAGICK_PATH} ${sourcePath} -sample '${dimensions.x}x${dimensions.y}!' ${sourcePath}`)
}

function convertSpectrogram (sourcePath, attrs) {
  const outputPath = sourcePath.replace('.png', `.${attrs.contentType}`)
  return runExec(`${IMAGEMAGICK_PATH} -strip -interlace Plane -quality ${100 - attrs.jpegCompression}% ${sourcePath} ${outputPath}`)
}

async function cloneFile (sourcePath) {
  const partials = sourcePath.split('.')
  partials[partials.length - 1] += '_cached'
  const destinationPath = partials.join()
  await runExec(`cp ${sourcePath} ${destinationPath}`)
  return destinationPath
}

async function cloneFiles (audioFilePath, spectrogramFilePath) {
  const pathsArr = await Promise.all([
    cloneFile(audioFilePath),
    ...spectrogramFilePath ? [cloneFile(spectrogramFilePath)] : []
  ])
  return {
    audioFilePathCached: pathsArr[0],
    spectrogramFilePathCached: pathsArr[1]
  }
}

function uploadCachedFiles (streamId, audioFilename, audioFilePath, spectrogramFilename, spectrogramFilePath) {
  const audioStoragePath = `${streamId}/audio/${audioFilename}`
  const spectrogramStoragePath = `${streamId}/image/${spectrogramFilename}`
  const proms = [
    storageService.upload(STREAMS_CACHE_BUCKET, audioStoragePath, audioFilePath),
    ...!!spectrogramFilename && spectrogramFilePath ? [storageService.upload(STREAMS_CACHE_BUCKET, spectrogramStoragePath, spectrogramFilePath)] : []
  ]
  return Promise.all(proms)
}

function deleteLocalFiles (segments, audioFilePath, audioFilePathCached, spectrogramFilePathCached) {
  segments.forEach((segment) => {
    assetUtils.deleteLocalFileFromFileSystem(segment.sourceFilePath)
  })
  if (audioFilePathCached) {
    assetUtils.deleteLocalFileFromFileSystem(audioFilePathCached)
  }
  if (audioFilePath) {
    assetUtils.deleteLocalFileFromFileSystem(audioFilePath)
  }
  if (spectrogramFilePathCached) {
    assetUtils.deleteLocalFileFromFileSystem(spectrogramFilePathCached)
  }
}

async function generateFile (req, res, attrs, segments, additionalHeaders) {
  const reqContentType = req.rfcx.content_type
  const tmpDir = `${CACHE_DIRECTORY}ffmpeg/`
  const filename = combineStandardFilename(attrs, req)
  const extension = attrs.fileType === 'spec' ? 'wav' : attrs.fileType
  const spectrogramExtension = 'png'

  const start = moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf()
  const end = moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf()

  const audioFilename = `${filename}.${extension}`
  const audioFilePath = `${tmpDir}${audioFilename}`
  let spectrogramFilename = `${filename}.${spectrogramExtension}`
  let spectrogramFilePath = `${tmpDir}${spectrogramFilename}`

  await downloadSegments(segments)
  await convertAudio(segments, start, end, attrs, audioFilePath)
  if (attrs.fileType === 'spec') {
    const soxFriendlyHeight = getSoxFriendlyHeight(attrs.dimensions.y)
    await makeSpectrogram(audioFilePath, spectrogramFilePath, { ...attrs, soxFriendlyHeight })
    if (soxFriendlyHeight !== attrs.dimensions.y) { // if requested image height is not 1+2^n, then resize it back to requested height
      await resizeSpectrogram(spectrogramFilePath, attrs.dimensions)
      if (req.rfcx.content_type !== 'png') {
        await convertSpectrogram(spectrogramFilePath, { ...attrs, contentType: reqContentType })
        spectrogramFilename = `${filename}.${reqContentType}`
        spectrogramFilePath = `${tmpDir}${spectrogramFilename}`
      }
    }
  }
  const { audioFilePathCached, spectrogramFilePathCached } = MEDIA_CACHE_ENABLED ? await cloneFiles(audioFilePath, attrs.fileType === 'spec' ? spectrogramFilePath : null) : {}
  if (attrs.fileType === 'spec') {
    await audioUtils.serveAudioFromFile(res, spectrogramFilePath, spectrogramFilename, `image/${reqContentType}`, !!req.query.inline, additionalHeaders)
  } else {
    await audioUtils.serveAudioFromFile(res, audioFilePath, audioFilename, audioUtils.formatSettings[attrs.fileType].mime, !!req.query.inline, additionalHeaders)
  }
  if (MEDIA_CACHE_ENABLED) {
    const args = [
      attrs.streamId,
      audioFilename,
      audioFilePathCached,
      ...attrs.fileType === 'spec' ? [spectrogramFilename, spectrogramFilePathCached] : []
    ]
    await uploadCachedFiles(...args)
  }
  const clearArgs = [
    segments,
    ...MEDIA_CACHE_ENABLED ? [audioFilePathCached] : [null],
    ...attrs.fileType === 'spec' ? [audioFilePath] : [null],
    ...(attrs.fileType === 'spec' && MEDIA_CACHE_ENABLED) ? [spectrogramFilePathCached] : [null]
  ]
  deleteLocalFiles(...clearArgs)
  segments = null
  attrs = null
}

function deleteFilesForStream (dbStream) {
  return new Promise((resolve, reject) => {
    models.StreamSegment
      .findAll({
        where: {
          stream_id: dbStream.id
        },
        include: [
          {
            model: models.StreamSourceFile,
            as: 'stream_source_file',
            attributes: models.StreamSourceFile.attributes.lite
          },
          {
            model: models.FileExtension,
            as: 'file_extension',
            attributes: models.FileExtension.attributes.lite
          }
        ]
      })
      .then((dbSegments) => {
        if (dbSegments || dbSegments.length) {
          resolve('No segment files')
          return
        }
        const keys = []
        dbSegments.forEach((segment) => {
          const ts = moment.tz(segment.start, 'UTC')
          const segmentExtension = segment.file_extension && segment.file_extension.value ? segment.file_extension.value : path.extname(segment.stream_source_file.filename)
          const key = `${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.stream_id}/${segment.id}${segmentExtension}`
          keys.push(key)
        })
        console.log(`Deleting following files in ${INGEST_BUCKET} bucket:`, keys.join(', '))
        return storageService.deleteFiles(INGEST_BUCKET, keys)
      })
  })
}

function clipToStr (clip) {
  if (clip === 'full') {
    return 'full'
  } else {
    return `${clip.bottom}.${clip.top}`
  }
}

function combineStandardFilename (attrs, req) {
  let filename = `${attrs.streamId}_t${attrs.time.starts}.${attrs.time.ends}_r${clipToStr(attrs.clip)}_g${parseFloat(attrs.gain)}_f${attrs.fileType}`
  if (attrs.fileType === 'spec') {
    filename += `_d${attrs.dimensions.x}.${attrs.dimensions.y}_w${attrs.windowFunc}_z${attrs.zAxis}`
    if (req.rfcx.content_type === 'jpeg') {
      filename += `_c${attrs.jpegCompression}`
    }
    if (attrs.monochrome === 'true') {
      filename += '_mtrue'
    }
  }
  return filename
}

function gluedDateToISO (dateStr) {
  return moment(dateStr, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').toISOString()
}

module.exports = {
  parseFileNameAttrs,
  checkAttrsValidity,
  getFile,
  deleteFilesForStream,
  gluedDateToISO,
  convertAudio
}
