const ValidationError = require('../converter/validation-error')
const strArrToJSArr = require('./checkin-audio').audio.strArrToJSArr

const minAttrs = ['queued_at', 'measured_at']
const metaTypes = ['data_transfer', 'cpu', 'battery', 'power', 'network', 'lightmeter', 'accelerometer', 'disk_usage', 'location', 'reboots', 'software', 'previous_checkins', 'audio']

function _undef (attr) {
  return attr === undefined
}

function _strIsInt (str) {
  return Number.isInteger(parseInt(str))
}

function _strIsNumber (str) {
  const value = parseFloat(str)
  return typeof value === 'number' && value === value && value !== Infinity && value !== -Infinity // eslint-disable-line no-self-compare
}

function _str (str) {
  return typeof str === 'string'
}

function _gt0 (str) {
  return parseInt(str) > 0
}

function isValidItem (item, type) {
  switch (type) {
    case 'data_transfer':
    case 'cpu':
    case 'battery':
    case 'power':
    case 'reboots':
      return item.every((el) => _strIsInt(el))
    case 'network':
      return item.length === 4 && _strIsInt(item[0]) && _strIsInt(item[1]) && _str(item[2]) && _str(item[3])
    case 'lightmeter':
      return item.length === 3 && _strIsInt(item[0]) && _strIsInt(item[1]) && _str(item[2])
    case 'accelerometer':
      try {
        const xyz = item[1].split(',')
        return item.length === 3 && _strIsInt(item[0]) && _strIsNumber(xyz[0]) && _strIsNumber(xyz[1]) && _strIsNumber(xyz[2]) && _strIsInt(item[2])
      } catch (e) {
        return false
      }
    case 'disk_usage':
      return item.length === 4 && _str(item[0]) && _strIsInt(item[1]) && _strIsInt(item[2]) && _strIsInt(item[3])
    case 'location':
      return item.length === 4 && _strIsInt(item[0]) && _strIsNumber(item[1]) && _strIsNumber(item[2]) && _strIsNumber(item[3])
    case 'software':
      return item.length === 2 && _str(item[0]) && _str(item[1])
    case 'previous_checkins':
      return item.length === 2 && _str(item[0]) && _strIsInt(item[1])
    case 'audio':
      return item.length === 9 && _strIsInt(item[0]) && _strIsInt(item[1]) && _str(item[2]) && _str(item[3]) && _strIsInt(item[4]) && _gt0(item[4]) && _strIsInt(item[5]) && _gt0(item[5]) &&
        _str(item[6]) && _str(item[7]) && _strIsInt(item[8]) && _gt0(item[8])
    default:
      return false
  }
}

function isMetaValid (json) {
  if (!json) {
    throw new ValidationError('metadata is not defined')
  }
  if (minAttrs.some(_undef)) {
    throw new ValidationError(`metadata is missing minimum attributes: ${minAttrs.join(', ')}`)
  }
  metaTypes.forEach((meta) => {
    if (json[meta]) {
      const metaArr = strArrToJSArr(json[meta], '|', '*')
      metaArr.forEach((item) => {
        if (!isValidItem(item, meta)) {
          console.error(`'${meta}' has invalid format`, metaArr)
          throw new ValidationError(`'${meta}' has invalid format`)
        }
      })
    }
  })
  return true
}

exports.validator = {
  isMetaValid
}
