const { runExec } = require('./shell')
const models = require('../../_models')
const path = require('path')
const moment = require('moment-timezone')
const audioUtils = require('../../../noncore/_utils/rfcx-audio').audioUtils
const assetUtils = require('../../../noncore/_utils/internal-rfcx/asset-utils').assetUtils
const mathUtil = require('./math')
const random = require('../../../common/crypto/random')
const storageService = require('../../_services/storage')

const MEDIA_CACHE_ENABLED = `${process.env.MEDIA_CACHE_ENABLED}` === 'true'
const CACHE_DIRECTORY = process.env.CACHE_DIRECTORY
const FFMPEG_PATH = process.env.FFMPEG_PATH
const SOX_PATH = process.env.SOX_PATH
const IMAGEMAGICK_PATH = process.env.IMAGEMAGICK_PATH

async function getFile (req, res, attrs, fileExtension, segments, nextTimestamp) {
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

  const getFromCache = MEDIA_CACHE_ENABLED ? await storageService.exists(storageService.buckets.streamsCache, storageFilePath) : false
  if (getFromCache) {
    res.attachment(attrs.fileType === 'spec' ? spectrogramFilename : audioFilename)
    for (const key in additionalHeaders) {
      res.setHeader(key, additionalHeaders[key])
    }
    return storageService.getReadStream(storageService.buckets.streamsCache, storageFilePath).pipe(res)
  } else {
    return generateFile(req, res, attrs, fileExtension, segments, additionalHeaders)
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

function getSegmentExtension (segment) {
  return segment.file_extension ? (typeof segment.file_extension === 'string' ? segment.file_extension : segment.file_extension.value) : path.extname(segment.stream_source_file.filename)
}

function calcSegmentDirname (segment) {
  const ts = moment.tz(segment.start, 'UTC')
  return `${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.stream_id}`
}

function calcSegmentPath (segment) {
  if (!segment.path) {
    console.error(`Segment ${segment.id} 'path' field is NULL`)
    segment.path = calcSegmentDirname(segment)
  }
  const segmentExtension = getSegmentExtension(segment)
  return `${segment.path}/${segment.id}${segmentExtension}`
}

function downloadSegments (segments) {
  const downloadProms = []
  for (const segment of segments) {
    const remotePath = calcSegmentPath(segment)
    const segmentExtension = getSegmentExtension(segment)
    segment.sourceFilePath = `${CACHE_DIRECTORY}ffmpeg/${random.randomString(32)}${segmentExtension}`
    downloadProms.push(storageService.download(storageService.buckets.streams, remotePath, segment.sourceFilePath))
  }
  return Promise.all(downloadProms)
}

async function convertAudio (segments, starts, ends, attrs, outputPath, extension) {
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
      if (!attrs.maxSampleRate || attrs.maxSampleRate < sampleRate) {
        attrs.maxSampleRate = sampleRate
      }
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
  command += '" ' // closes filter_complex
  command += '-y ' // overwrite output files
  command += '-vn ' // disable video
  command += '-ac 1 ' // -ac 1 - single audio channel
  if (attrs.fileType === 'mp3') {
    command += `-b:a ${attrs.maxSampleRate > 38400 ? '96' : '32'}k ` // 38400 === 48000 * 0.8
  }

  if (attrs.fileType !== 'spec' && attrs.clip && attrs.clip !== 'full') {
    const tempOutputPath = outputPath.replace(`.${extension}`, `_.${extension}`)
    command += tempOutputPath
    await runExec(command)

    let freqCutCommand = `${SOX_PATH} ${tempOutputPath} ${outputPath} sinc `
    if (parseInt(attrs.clip.bottom)) {
      freqCutCommand += `${attrs.clip.bottom}`
    }
    if (parseInt(attrs.clip.top)) {
      freqCutCommand += `-${attrs.clip.top - 1}`
    }
    await runExec(freqCutCommand)
    assetUtils.deleteLocalFileFromFileSystem(tempOutputPath)
  } else {
    command += outputPath
    await runExec(command)
  }
}

async function makeSpectrogram (sourcePath, outputPath, filename, fileExtension, attrs) {
  const height = getSoxFriendlyHeight(attrs.dimensions.y)
  await renderSpectrogram(sourcePath, outputPath, attrs.monochrome, attrs.palette, attrs.dimensions.x, height, attrs.windowFunc, attrs.zAxis)
  if (attrs.clip && attrs.clip !== 'full') {
    await cropSpectrogram(outputPath, attrs, height)
  }
  await resizeSpectrogram(outputPath, attrs.dimensions)
  if (fileExtension !== 'png') {
    await convertSpectrogram(outputPath, { ...attrs, fileExtension })
    filename = filename.replace('.png', `.${fileExtension}`)
  }
  return filename
}

function renderSpectrogram (sourcePath, outputPath, monochrome, palette, width, height, windowFunc, zAxis) {
  let color = '-lm'
  if (monochrome === 'true') {
    color = '-lm'
  } else {
    switch (palette) {
      case '1':
        color = '-h'
      case '2':
        color = '-p6'
      case '3':
        color = '-p3'
      case '4':
        color = '-lr'
      default:
        color = '-h'
    }
  }
  return runExec(`${SOX_PATH} ${sourcePath} -n spectrogram -r ${color} -o  ${outputPath} -x ${width} -y ${height} -w ${windowFunc} -z ${zAxis} -s`)
}

function hzToPx (height, sampleRate, hz) {
  const maxHz = sampleRate / 2
  return height * hz / maxHz
}

function cropSpectrogram (sourcePath, attrs, height) {
  const topPx = hzToPx(height, attrs.maxSampleRate, attrs.clip.top)
  const bottomPx = hzToPx(height, attrs.maxSampleRate, attrs.clip.bottom)
  return runExec(`${IMAGEMAGICK_PATH} ${sourcePath} -crop '${attrs.dimensions.x}x${topPx - bottomPx}+0+${height - topPx}' +repage ${sourcePath}`)
}

function resizeSpectrogram (sourcePath, dimensions) {
  return runExec(`${IMAGEMAGICK_PATH} ${sourcePath} -resize '${dimensions.x}x${dimensions.y}!' ${sourcePath}`)
}

function convertSpectrogram (sourcePath, attrs) {
  const outputPath = sourcePath.replace('.png', `.${attrs.fileExtension}`)
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
    storageService.upload(storageService.buckets.streamsCache, audioStoragePath, audioFilePath),
    ...!!spectrogramFilename && spectrogramFilePath ? [storageService.upload(storageService.buckets.streamsCache, spectrogramStoragePath, spectrogramFilePath)] : []
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

async function generateFile (req, res, attrs, fileExtension, segments, additionalHeaders) {
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
  await convertAudio(segments, start, end, attrs, audioFilePath, extension)
  if (attrs.fileType === 'spec') {
    spectrogramFilename = await makeSpectrogram(audioFilePath, spectrogramFilePath, spectrogramFilename, fileExtension, attrs)
    spectrogramFilePath = `${tmpDir}${spectrogramFilename}`
  }
  const { audioFilePathCached, spectrogramFilePathCached } = MEDIA_CACHE_ENABLED ? await cloneFiles(audioFilePath, attrs.fileType === 'spec' ? spectrogramFilePath : null) : {}
  if (attrs.fileType === 'spec') {
    await audioUtils.serveAudioFromFile(res, spectrogramFilePath, spectrogramFilename, `image/${fileExtension}`, !!req.query.inline, additionalHeaders)
  } else {
    await audioUtils.serveAudioFromFile(res, audioFilePath, audioFilename, assetUtils.mimeTypeFromAudioCodec(attrs.fileType), !!req.query.inline, additionalHeaders)
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
        console.info(`Deleting following files in ${storageService.buckets.streams} bucket:`, keys.join(', '))
        return storageService.deleteFiles(storageService.buckets.streams, keys)
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

module.exports = {
  getFile,
  deleteFilesForStream,
  convertAudio,
  calcSegmentDirname,
  calcSegmentPath
}
