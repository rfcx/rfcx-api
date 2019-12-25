const models = require("../../models");
const EmptyResultError = require('../../utils/converter/empty-result-error');
const sqlUtils = require("../../utils/misc/sql");
const exec = require("child_process").exec;
const Promise = require("bluebird");
const path = require('path');
const moment = require('moment-timezone');
const ValidationError = require("../../utils/converter/validation-error");
const audioUtils = require("../../utils/rfcx-audio").audioUtils;

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
      let item = nameArr.find((item) => {
        return item.startsWith(symb);
      });
      return item? item.slice(symb.length) : undefined;
    }
    const dimension = findStartsWith('d');
    resolve({
      streamGuid: nameArr[0],
      starts: findStartsWith('s'),
      ends: findStartsWith('e'),
      gain: findStartsWith('g'),
      fileType: findStartsWith('f'),
      dimensions: dimension? {
        x: dimension.split('x')[0],
        y: dimension.split('x')[1]
      } : undefined,
      window: findStartsWith('w'),
      contrast: findStartsWith('z'),
      sampleRate: findStartsWith('sr'),
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
    if (!attrs.starts || !attrs.ends) {
      return reject(new ValidationError('"s" (starts) and "e" (ends) attributes are required.'));
    }
    if (!possibleExtensions.includes(req.rfcx.content_type)) {
      return reject(new ValidationError(`Unsupported file extension. Possible values: ${possibleExtensions.join(', ')}`));
    }
    if (moment.tz(attrs.ends, 'UTC').diff(moment.tz(attrs.starts, 'UTC'), 'minutes') > 15) {
      return reject(new ValidationError('Maximum gap between start and end should be less than 15 minutes.'));
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
      return reject(new ValidationError('"d" (dimensions) attribute is required and should have the following format: 100x200.'));
    }
    if (attrs.fileType === 'spec' && attrs.window && !possibleWindowFuncs.includes(attrs.window)) {
      return reject(new ValidationError(`"w" unsupported window function. Possible values: ${possibleWindowFuncs.join(', ')}.`));
    }
    if (!possibleFileTypes.includes(attrs.fileType)) {
      return reject(new ValidationError(`"f" unsupported file type. Possible values: ${possibleFileTypes.join(', ')}.`));
    }
    return resolve(true);
  });
}

function getSegments(opts) {
  const starts = moment.tz(opts.starts, 'UTC').valueOf();
  const ends = moment.tz(opts.ends, 'UTC').valueOf();
  return models.Segment
    .findAll({
      where: {
        stream: opts.streamId,
        $or: [
          {
            $and: {
              starts: { $lte: starts },
              ends:   { $gte: starts }
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

function generateFile(req, res, attrs, segments) {
  const filename = req.params.attrs;
  const extension = attrs.fileType === 'spec'? 'wav' : attrs.fileType;
  const filenameAudio = `${filename}.${extension}`;
  const audioFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameAudio}`;
  const filenameSpec = `${filename}.png`;
  const specFilePath = `${process.env.CACHE_DIRECTORY}ffmpeg/${filenameSpec}`
  const starts = moment.tz(attrs.starts, 'UTC').valueOf();
  const ends = moment.tz(attrs.ends, 'UTC').valueOf();
  let proms = [];
  let sox = `${process.env.SOX_PATH} --combine concatenate `;
  // Step 1: Download all segment files
  segments.forEach((segment) => {
    const ts = moment.tz(segment.starts, 'UTC');
    const extension = path.extname(segment.MasterSegment.filename)
    const remotePath = `s3://${process.env.INGEST_BUCKET}/${ts.format('YYYY')}/${ts.format('MM')}/${ts.format('DD')}/${segment.Stream.guid}/${segment.guid}${extension}`;

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
        sox += ` "|${process.env.SOX_PATH} ${segment.sourceFilePath} -p `
        // when requested time range starts earlier than first segment
        // add empty sound at the start
        if (ind === 0 && starts < segment.starts) {
          let padStart = (segment.starts - starts) / 1000
          sox += ` pad ${padStart} 0`
        }
        // when there is a gap between current and next segment
        // add empty sound at the end of current segment
        let padEnd = segments[ind + 1]? (segments[ind + 1].starts - segment.ends) / 1000 : 0;
        sox += ` pad 0 ${padEnd}`
        // when requested time range starts later than first segment
        // cut first segment at the start
        if (ind === 0 && starts > segment.starts) {
          sox += ` trim ${(starts - segment.starts) / 1000} -0`
        }
        // when requested time range ends earlier than last segment
        // cut last segment at the end
        if (ind === (segments.length - 1) && ends < segment.ends) {
          sox += ` trim 0 ${(segment.ends - ends) / 1000}`
        }
        // when requested time range ends later than last segment
        // add empty sound at the end
        if (ind === (segments.length - 1) && ends > segment.ends) {
          sox += ` pad 0 ${(ends - segment.ends) / 1000}`
        }
        sox += '"'
      })
      // Set sample rate, channels count and file name
      if (attrs.sampleRate) {
        sox += ` -r ${attrs.sampleRate}`;
      }
      sox += ` -c 1 ${audioFilePath}`;
      if (attrs.gain) {
        sox += ` gain ${attrs.gain}`;
      }
      return new Promise(function(resolve, reject) {
        console.log('\n\n', sox, '\n\n');
        exec(sox, (err, stdout, stderr) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(stdout.trim());
        });
      });
    })
    .then(() => {
      // Step 3: generate spectrogram if file type is "spec"
      if (attrs.fileType !== 'spec') {
        return true
      }
      else {
        let windowFunc = attrs.window? attrs.window : 'dolph';
        let zAxis = attrs.contrast !== undefined? attrs.contrast : 95;
        let soxPng = `${process.env.SOX_PATH} ${audioFilePath} -n spectrogram -h -r -o ${specFilePath} -x ${attrs.dimensions.x} -y ${attrs.dimensions.y} -w ${windowFunc} -z ${zAxis} -s`;
        return new Promise(function(resolve, reject) {
          console.log('\n', soxPng, '\n');
          exec(soxPng, (err, stdout, stderr) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(stdout.trim());
          });
        });
      }
    })
    .then(() => {
      if (attrs.fileType === 'spec') {
        return audioUtils.serveAudioFromFile(res, specFilePath, filenameSpec, "image/png", !!req.query.inline)
      }
      else {
        return audioUtils.serveAudioFromFile(res, audioFilePath, filenameAudio, audioUtils.formatSettings[attrs.fileType].mime, !!req.query.inline)
      }
    })
}

module.exports = {
  parseFileNameAttrs,
  areFileNameAttrsValid,
  getSegments,
  generateFile,
}
