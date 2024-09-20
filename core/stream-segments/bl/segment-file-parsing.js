const moment = require('moment-timezone')
const { ValidationError } = require('../../../common/error-handling/errors')

const possibleWindowFuncs = ['dolph', 'hann', 'hamming', 'bartlett', 'rectangular', 'kaiser']
const possibleExtensions = ['png', 'jpeg', 'wav', 'opus', 'flac', 'mp3']
const possibleFileTypes = ['spec', 'wav', 'opus', 'flac', 'mp3']
const possibleAudioFileTypes = ['wav', 'opus', 'flac', 'mp3']

function parseFileNameAttrs (name) {
  return new Promise((resolve, reject) => {
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
    const streamId = nameArr[0] && nameArr[0].length > 0 ? nameArr[0] : undefined
    const dimensionsStr = findStartsWith('d')
    const timeStr = findStartsWith('t')
    const clipStr = findStartsWith('r')
    resolve({
      streamId,
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
      palette: findStartsWith('p') || '1',
      zAxis: findStartsWith('z') || '120',
      jpegCompression: findStartsWith('c') || 0
      // sampleRate: findStartsWith('sr'),
    })
  })
}

function checkAttrsValidity (req, attrs, fileExtension) {
  if (!attrs.streamId) {
    throw (new ValidationError('Stream id is required.'))
  }
  if (!attrs.fileType) {
    throw new ValidationError('"f" (file type) attribute is required.')
  }
  if (!attrs.time || !attrs.time.starts || !attrs.time.ends) {
    throw new ValidationError('"t" (time) attribute is required and should have the following format: "t20190907T004303000Z.20190907T005205000Z".')
  }
  if (!possibleExtensions.includes(fileExtension)) {
    throw new ValidationError(`Unsupported file extension. Possible values: ${possibleExtensions.join(', ')}`)
  }
  if ((moment(attrs.time.ends, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')).diff((moment(attrs.time.starts, 'YYYYMMDDTHHmmssSSSZ').tz('UTC')), 'minutes') > 15) {
    throw new ValidationError('Maximum range between start and end should be less than 15 minutes.')
  }
  if (attrs.clip && attrs.clip.top && attrs.clip.bottom && parseInt(attrs.clip.top) <= parseInt(attrs.clip.bottom)) {
    throw new ValidationError('Highpass frequency filter can not be greater or equal to lowpass')
  }
  if (attrs.fileType === 'spec' && !['png', 'jpeg'].includes(fileExtension)) {
    throw new ValidationError('Unsupported file extension. Only png or jpeg are available for type spec')
  }
  if (possibleAudioFileTypes.includes(attrs.fileType) && fileExtension !== attrs.fileType) {
    throw new ValidationError('Invalid file extension. File type and file extension should match.')
  }
  if (attrs.fileType === 'spec' && (!attrs.dimensions || !attrs.dimensions.x || !attrs.dimensions.y)) {
    throw new ValidationError('"d" (dimensions) attribute is required and should have the following format: d100.200.')
  }
  if (attrs.fileType === 'spec' && attrs.dimensions && attrs.dimensions.y > 1024) {
    throw new ValidationError('Spectrogram height can not be greater than 1024px')
  }
  if (attrs.fileType === 'spec' && attrs.windowFunc && !possibleWindowFuncs.includes(attrs.windowFunc)) {
    throw new ValidationError(`"w" unsupported window function. Possible values: ${possibleWindowFuncs.join(', ')}.`)
  }
  if (!possibleFileTypes.includes(attrs.fileType)) {
    throw new ValidationError(`"${attrs.fileType}" unsupported file type. Possible values: ${possibleFileTypes.join(', ')}.`)
  }
  if (parseInt(attrs.zAxis) < 20 || parseInt(attrs.zAxis) > 180) {
    throw new ValidationError('"z" may range from 20 to 180.')
  }
  if (isNaN(parseFloat(attrs.gain))) {
    throw new ValidationError('"g" should be float value and be greater or equal to 0')
  }
  return true
}

module.exports = {
  parseFileNameAttrs,
  checkAttrsValidity
}
