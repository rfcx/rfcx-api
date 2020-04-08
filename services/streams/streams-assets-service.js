const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const sqlUtils = require("../../utils/misc/sql");
const exec = require("child_process").exec;
const Promise = require("bluebird");
const path = require('path');
const moment = require('moment-timezone');
const ValidationError = require("../../utils/converter/validation-error");
const audioUtils = require("../../utils/rfcx-audio").audioUtils;
const assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
const S3Service = require("../s3/s3-service");
const mathUtil = require('../../utils/misc/math');

const possibleWindowFuncs = ["dolph", "hann", "hamming", "bartlett", "rectangular", "kaiser"];
const possibleExtensions = ['png', 'jpeg', 'wav', 'opus', 'flac', 'mp3'];
const possibleFileTypes = ['spec', 'wav', 'opus', 'flac', 'mp3'];
const possibleAudioFileTypes = ['wav', 'opus', 'flac', 'mp3'];

function parseFileNameAttrs(req) {
  return new Promise((resolve, reject) => {
    const name = req.params.attrs;
    if (!name) {
      reject(new ValidationError('File parameters must be specified in the url.'));
      return;
    }
    const nameArr = name.split('_');
    if (!nameArr || !nameArr.length) {
      reject(new ValidationError('File parameters are empty.'));
      return;
    }
    function findStartsWith(symb) {
      let item = nameArr.find((item, index) => {
        return index !== 0 && item.startsWith(symb);
      });
      return item? item.slice(symb.length) : undefined;
    }
    const dimensionsStr = findStartsWith('d');
    const timeStr = findStartsWith('t');
    const clipStr = findStartsWith('r');
    resolve({
      streamGuid: nameArr[0],
      time: timeStr? {
        starts: timeStr.split('.')[0],
        ends: timeStr.split('.')[1]
      } : undefined,
      clip: clipStr && clipStr !== 'full'? {
        bottom: clipStr.split('.')[0],
        top: clipStr.split('.')[1]
      } : 'full',
      gain: findStartsWith('g') || '1',
      fileType: findStartsWith('f'),
      dimensions: dimensionsStr? {
        x: dimensionsStr.split('.')[0],
        y: dimensionsStr.split('.')[1]
      } : undefined,
      windowFunc: findStartsWith('w') || 'dolph',
      zAxis: findStartsWith('z') || '120',
      jpegCompression: findStartsWith('c') || 0,
      // sampleRate: findStartsWith('sr'),
    });
  });
}

function areFileNameAttrsValid(req, attrs) {
  return new Promise((resolve, reject) => {
    if (!attrs.streamGuid) {
      return reject(new ValidationError('Stream guid is required.'));
    }
    if (!attrs.fileType) {
      return reject(new ValidationError('"f" (file type) attribute is required.'))
    }
    if (!attrs.time || !attrs.time.starts || !attrs.time.ends) {
      return reject(new ValidationError('"t" (time) attribute is required and should have the following format: "t20190907T004303000Z.20190907T005205000Z".'));
    }
    if (!possibleExtensions.includes(req.rfcx.content_type)) {
      return reject(new ValidationError(`Unsupported file extension. Possible values: ${possibleExtensions.join(', ')}`));
    }
    if ((moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')).diff((moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')), 'minutes') > 15) {
      return reject(new ValidationError('Maximum range between start and end should be less than 15 minutes.'));
    }
    if (attrs.fileType === 'spec' && (req.rfcx.content_type !== 'png' && req.rfcx.content_type !== 'jpeg')) {
      return reject(new ValidationError(`Unsupported file extension. Only png or jpeg are available for type spec`));
    }
    if (possibleAudioFileTypes.includes(attrs.fileType) && req.rfcx.content_type !== attrs.fileType) {
      return reject(new ValidationError(`Invalid file extension. File type and file extension should match.`));
    }
    if (attrs.fileType === 'spec' && (!attrs.dimensions || !attrs.dimensions.x || !attrs.dimensions.y)) {
      return reject(new ValidationError('"d" (dimensions) attribute is required and should have the following format: d100.200.'));
    }
    if (attrs.fileType === 'spec' && attrs.windowFunc && !possibleWindowFuncs.includes(attrs.windowFunc)) {
      return reject(new ValidationError(`"w" unsupported window function. Possible values: ${possibleWindowFuncs.join(', ')}.`));
    }
    if (!possibleFileTypes.includes(attrs.fileType)) {
      return reject(new ValidationError(`"f" unsupported file type. Possible values: ${possibleFileTypes.join(', ')}.`));
    }
    if (parseInt(attrs.zAxis) < 20 || parseInt(attrs.zAxis) > 180) {
      return reject(new ValidationError(`"z" may range from 20 to 180.`));
    }
    if (isNaN(parseFloat(attrs.gain))) {
      return reject(new ValidationError(`"g" should be float value and be greater or equal to 0`));
    }
    return resolve(true);
  });
}

function getFile(req, res, attrs, segments, nextTimestamp) {
  const filename = combineStandardFilename(attrs, req);
  const extension = attrs.fileType === 'spec'? 'wav' : attrs.fileType;

  const filenameAudio = `${filename}.${extension}`;
  const filenameSpec = `${filename}.png`;

  const s3AudioFilePath = `${attrs.streamGuid}/audio/${filenameAudio}`;
  const s3specFilePath = `${attrs.streamGuid}/image/${filenameSpec}`;

  const s3FilePath = attrs.fileType === 'spec'? s3specFilePath : s3AudioFilePath;

  let additionalHeaders = {
    'Access-Control-Expose-Headers': 'RFCx-Stream-Next-Timestamp, RFCx-Stream-Gaps',
    'RFCx-Stream-Gaps': getGapsForFile(attrs, segments)
  }
  if (nextTimestamp) {
    additionalHeaders['RFCx-Stream-Next-Timestamp'] = nextTimestamp;
  }

  return S3Service.headObject(s3FilePath, process.env.STREAMS_CACHE_BUCKET, true)
    .then((file) => {
      if (file) {
        res.attachment(attrs.fileType === 'spec'? filenameSpec : filenameAudio);
        for (let key in additionalHeaders) {
          res.setHeader(key, additionalHeaders[key]);
        }
        return S3Service.client
          .getObject({
            Bucket: process.env.STREAMS_CACHE_BUCKET,
            Key: s3FilePath
          })
          .createReadStream()
          .pipe(res);
      }
      else {
        return generateFile(req, res, attrs, segments, additionalHeaders);
      }
    })
}

function getGapsForFile(attrs, segments) {
  let gaps = [];
  const starts = moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();
  const ends = moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();
  segments.forEach((segment, ind) => {
    if (ind === 0 && starts < segment.starts) {
      gaps.push([starts, segment.starts]);
    }
    if ((ind + 1) <= (segments.length - 1)) {
      let nextSegment = segments[ind + 1];
      if (nextSegment.starts > segment.ends) {
        gaps.push([segment.ends, nextSegment.starts]);
      }
    }
    if ((ind === segments.length - 1) && segment.ends < ends) {
      gaps.push([segment.ends, ends]);
    }
  });
  return gaps;
}

function generateFile(req, res, attrs, segments, additionalHeaders) {
  const filename = combineStandardFilename(attrs, req);
  const extension = attrs.fileType === 'spec'? 'wav' : attrs.fileType;

  const filenameAudio = `${filename}.${extension}`;
  const filenameAudioCache = `${filename}_cached.${extension}`;

  const audioFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameAudio}`;
  const audioFilePathCached = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameAudioCache}`;

  let filenameSpec = `${filename}.png`;
  let filenameSpecCached = `${filename}_cached.png`;

  let specFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameSpec}`;
  let specFilePathCached = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameSpecCached}`;

  const s3AudioFilePath = `${attrs.streamGuid}/audio/${filenameAudio}`;
  const s3specFilePath = `${attrs.streamGuid}/image/${filenameSpec}`;

  const starts = moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();
  const ends = moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();

  let proms = [];
  let sox = `${process.env.SOX_PATH} --combine concatenate `;
  // Step 1: Download all segment files
  segments.forEach((segment) => {
    const ts = moment.tz(segment.starts, 'UTC');
    const segmentExtension = segment.FileExtension && segment.FileExtension.value?
      segment.FileExtension.value : path.extname(segment.MasterSegment.filename);
    const remotePath = `s3://${process.env.INGEST_BUCKET}/${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.Stream.guid}/${segment.guid}${segmentExtension}`;

    let prom = audioUtils.cacheSourceAudio(remotePath)
      .then(function (data) {
        segment.sourceFilePath = data.sourceFilePath;
      })
    proms.push(prom);
  })
  // Step 2: combine all segment files into one file
  return Promise.all(proms)
    .then(() => {
      segments.forEach((segment, ind) => {
        sox += ` "|${process.env.SOX_PATH}`
        if (attrs.gain && parseFloat(attrs.gain) !== 1) {
          sox += ` -v ${attrs.gain}`;
        }
        sox += ` ${segment.sourceFilePath} -p `

        let pad  = { start: 0, end: 0 };
        let trim = { start: 0, end: 0 };
        if (ind === 0 && starts < segment.starts) {
          // when requested time range starts earlier than first segment
          // add empty sound at the start
          pad.start = (segment.starts - starts) / 1000
        }
        let nextSegment = segments[ind + 1];
        if (ind < (segments.length - 1) && nextSegment && (nextSegment.starts - segment.ends) > 0) {
          // when there is a gap between current and next segment
          // add empty sound at the end of current segment
          pad.end = (nextSegment.starts - segment.ends) / 1000;
        }
        if (ind === (segments.length - 1) && ends > segment.ends) {
          // when requested time range ends later than last segment
          // add empty sound at the end
          pad.end = (ends - segment.ends) / 1000
        }

        if (ind === 0 && starts > segment.starts) {
          // when requested time range starts later than first segment
          // cut first segment at the start
          trim.start = (starts - segment.starts) / 1000;
        }
        if (ind === (segments.length - 1) && ends < segment.ends) {
          // when requested time range ends earlier than last segment
          // cut last segment at the end
          trim.end = (segment.ends - ends) / 1000;
        }
        if (pad.start !== 0 || pad.end !== 0) {
          sox += ` pad ${pad.start} ${pad.end}`;
        }
        if (trim.start !== 0 || trim.end !== 0) {
          sox += ` trim ${trim.start} -${trim.end}`;
        }
        sox += '"'
      })
      // Set sample rate, channels count and file name
      // if (attrs.sampleRate) {
      //   sox += ` -r ${attrs.sampleRate}`;
      // }
      sox += ` -c 1 ${audioFilePath}`;
      console.log('\n\n', sox, '\n\n');
      return runExec(sox);
    })
    .then(() => {
      // Step 3: generate spectrogram if file type is "spec"
      if (attrs.fileType !== 'spec') {
        return true
      }
      else {
        // From Sox docs:
        // "−y" can be slow to produce the spectrogram if this number is not one more than a power of two (e.g. 129).
        // So we will raise spectrogram height to nearest power of two and then resize image back to requested height
        let yDimension = mathUtil.isPowerOfTwo(attrs.dimensions.y - 1) ? attrs.dimensions.y : (mathUtil.ceilPowerOfTwo(attrs.dimensions.y) + 1);
        let soxPng = `${process.env.SOX_PATH} ${audioFilePath} -n spectrogram -h -r -o ${specFilePath} -x ${attrs.dimensions.x} -y ${yDimension} -w ${attrs.windowFunc} -z ${attrs.zAxis} -s`;
        console.log('\n', soxPng, '\n');
        return runExec(soxPng)
          .then(() => {
            // if requested image height is not 1+2^n, then resize it back to requested height
            if (yDimension !== attrs.dimensions.y) {
              let imgMagickPng = `${process.env.IMAGEMAGICK_PATH} ${specFilePath} -sample '${attrs.dimensions.x}x${attrs.dimensions.y}!' ${specFilePath}`;
              console.log('\n', imgMagickPng, '\n');
              return runExec(imgMagickPng)
            }
            else {
              return Promise.resolve();
            }
          })
          .then(() => {
            if (req.rfcx.content_type !== 'png') {
              let pngspecFilePath = `${specFilePath}`;
              specFilePath = specFilePath.replace('.png', `.${req.rfcx.content_type}`);
              specFilePathCached = specFilePathCached.replace('.png', `.${req.rfcx.content_type}`);
              filenameSpec = filenameSpec.replace('.png', `.${req.rfcx.content_type}`);
              filenameSpecCached = filenameSpecCached.replace('.png', `.${req.rfcx.content_type}`);
              let imgMagickPng = `${process.env.IMAGEMAGICK_PATH} -strip -interlace Plane -quality ${100 - attrs.jpegCompression}% ${pngspecFilePath} ${specFilePath}`;
              console.log('\n', imgMagickPng, '\n');
              return runExec(imgMagickPng)
            }
            else {
              return Promise.resolve();
            }
          })
      }

    })
    .then(() => {
      // Make copies of files for futher caching
      // We need to make copies because original file is being deleted once client finish it download
      let proms = [ runExec(`cp ${audioFilePath} ${audioFilePathCached}`) ]
      if (attrs.fileType === 'spec') {
        proms.push(runExec(`cp ${specFilePath} ${specFilePathCached}`))
      }
      return Promise.all(proms);
    })
    .then(() => {
      // Rspond with a file
      if (attrs.fileType === 'spec') {
        return audioUtils.serveAudioFromFile(res, specFilePath, filenameSpec, `image/${req.rfcx.content_type}`, !!req.query.inline, additionalHeaders)
      }
      else {
        return audioUtils.serveAudioFromFile(res, audioFilePath, filenameAudio, audioUtils.formatSettings[attrs.fileType].mime, !!req.query.inline, additionalHeaders)
      }
    })
    .then(() => {
      // Upload files to cache S3 bucket
      let proms = [
        S3Service.putObject(audioFilePathCached, s3AudioFilePath, process.env.STREAMS_CACHE_BUCKET)
      ];
      if (attrs.fileType === 'spec') {
        proms.push(S3Service.putObject(specFilePathCached, s3specFilePath, process.env.STREAMS_CACHE_BUCKET));
      }
      return Promise.all(proms);
    })
    .then(() => {
      // Clean up everything
      segments.forEach((segment) => {
        assetUtils.deleteLocalFileFromFileSystem(segment.sourceFilePath);
      });
      assetUtils.deleteLocalFileFromFileSystem(audioFilePathCached);
      if (attrs.fileType === 'spec') {
        assetUtils.deleteLocalFileFromFileSystem(audioFilePath);
        assetUtils.deleteLocalFileFromFileSystem(specFilePathCached);
      }
      segments = null;
      attrs = null;
      return true;
    });
  }

function deleteFilesForStream(dbStream) {
  return new Promise((resolve, reject) => {
    models.Segment
      .findAll({
        where: {
          stream: dbStream.id
        },
        include: [{ all: true }],
      })
      .then((dbSegments) => {
        if (dbSegments || dbSegments.length) {
          resolve('No segment files');
          return;
        }
        let params = {
          Bucket: process.env.INGEST_BUCKET,
          Delete: {
            Objects: [ ],
            Quiet: false
          }
        };
        dbSegments.forEach((segment) => {
          const ts = moment.tz(segment.starts, 'UTC');
          const segmentExtension = segment.FileExtension && segment.FileExtension.value? segment.FileExtension.value : path.extname(segment.MasterSegment.filename);
          const Key = `${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.Stream.guid}/${segment.guid}${segmentExtension}`;
          params.Delete.Objects.push({ Key });
        });
        console.log(`Deleting following files in ${process.env.INGEST_BUCKET} bucket:`, params.Delete.Objects);
        return S3Service.client.deleteObjects(params, (err, data) => {
          if (err) {
            return reject(err);
          }
          resolve(data);
        });
      })
  })
}


function runExec(command) {
  return new Promise(function(resolve, reject) {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function clipToStr(clip) {
  if (clip === 'full') {
    return 'full'
  }
  else {
    return `${clip.bottom}.${clip.top}`;
  }
}

function combineStandardFilename(attrs, req) {
  let filename = `${attrs.streamGuid}_t${attrs.time.starts}.${attrs.time.ends}_r${clipToStr(attrs.clip)}_g${parseFloat(attrs.gain)}_f${attrs.fileType}`;
  if (attrs.fileType === 'spec') {
    filename += `_d${attrs.dimensions.x}.${attrs.dimensions.y}_w${attrs.windowFunc}_z${attrs.zAxis}`;
    if (req.rfcx.content_type === 'jpeg') {
      filename += `_c${attrs.jpegCompression}`;
    }
  }
  return filename;
}

module.exports = {
  parseFileNameAttrs,
  areFileNameAttrsValid,
  getFile,
  deleteFilesForStream,
}
