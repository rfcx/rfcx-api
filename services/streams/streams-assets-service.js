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

const possibleWindowFuncs = ["dolph", "hann", "hamming", "bartlett", "rectangular", "kaiser"];
const possibleExtensions = ['png', 'wav', 'opus', 'flac', 'mp3'];
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
    if (attrs.fileType === 'spec' && req.rfcx.content_type !== 'png') {
      return reject(new ValidationError(`Unsupported file extension. Only png is available for type spec`));
    }
    if (attrs.fileType === 'spec' && req.rfcx.content_type !== 'png') {
      return reject(new ValidationError(`Unsupported file extension. Only png is available for type spec`));
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

function getSegments(opts) {
  const starts = moment(opts.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();
  const ends = moment(opts.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC').valueOf();
  return models.Segment
    .findAll({
      where: {
        stream: opts.streamId,
        $or: [
          {
            $and: {
              starts: { $lte: starts },
              ends:   { $gt: starts }
            },
          },
          {
            $and: {
              starts: { $gte: starts },
              ends:   { $lte: ends }
            },
          },
          {
            $and: {
              starts: { $lt: ends },
              ends:   { $gte: ends }
            }
          }
        ]
      },
      include: [{ all: true }],
      order: 'starts ASC'
    })
}

function getFile(req, res, attrs, segments) {
  const filename = combineStandardFilename(attrs);
  const extension = attrs.fileType === 'spec'? 'wav' : attrs.fileType;

  const filenameAudio = `${filename}.${extension}`;
  const filenameSpec = `${filename}.png`;

  const s3AudioFilePath = `${attrs.streamGuid}/audio/${filenameAudio}`;
  const s3specFilePath = `${attrs.streamGuid}/image/${filenameSpec}`;

  const s3FilePath = attrs.fileType === 'spec'? s3specFilePath : s3AudioFilePath;

  return S3Service.headObject(s3FilePath, process.env.STREAMS_CACHE_BUCKET, true)
    .then((file) => {
      if (file) {
        res.attachment(attrs.fileType === 'spec'? filenameSpec : filenameAudio);
        return S3Service.client
          .getObject({
            Bucket: process.env.STREAMS_CACHE_BUCKET,
            Key: s3FilePath
          })
          .createReadStream()
          .pipe(res);
      }
      else {
        return generateFile(req, res, attrs, segments);
      }
    })
}

function generateFile(req, res, attrs, segments) {
  const filename = combineStandardFilename(attrs);
  const extension = attrs.fileType === 'spec'? 'wav' : attrs.fileType;

  const filenameAudio = `${filename}.${extension}`;
  const filenameAudioCache = `${filename}_cached.${extension}`;

  const audioFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameAudio}`;
  const audioFilePathCached = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameAudioCache}`;

  const filenameSpec = `${filename}.png`;
  const filenameSpecCached = `${filename}_cached.png`;

  const specFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameSpec}`;
  const specFilePathCached = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameSpecCached}`;

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
        let soxPng = `${process.env.SOX_PATH} ${audioFilePath} -n spectrogram -h -r -o ${specFilePath} -x ${attrs.dimensions.x} -y ${attrs.dimensions.y} -w ${attrs.windowFunc} -z ${attrs.zAxis} -s`;
        console.log('\n', soxPng, '\n');
        return runExec(soxPng);
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
        return audioUtils.serveAudioFromFile(res, specFilePath, filenameSpec, "image/png", !!req.query.inline)
      }
      else {
        return audioUtils.serveAudioFromFile(res, audioFilePath, filenameAudio, audioUtils.formatSettings[attrs.fileType].mime, !!req.query.inline)
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

function combineStandardFilename(attrs) {
  let filename = `${attrs.streamGuid}_t${attrs.time.starts}.${attrs.time.ends}_r${clipToStr(attrs.clip)}_g${parseFloat(attrs.gain)}_f${attrs.fileType}`;
  if (attrs.fileType === 'spec') {
    filename += `_d${attrs.dimensions.x}.${attrs.dimensions.y}_w${attrs.windowFunc}_z${attrs.zAxis}`;
  }
  return filename;
}

module.exports = {
  parseFileNameAttrs,
  areFileNameAttrsValid,
  getSegments,
  getFile,
  deleteFilesForStream,
}
