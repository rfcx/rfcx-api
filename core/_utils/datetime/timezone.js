const tz = require('geo-tz/all')
const { ValidationError } = require('../../../common/error-handling/errors')

function getTzByLatLng (latitude, longitude) {
  try {
    return tz.find(latitude, longitude)
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getTzByLatLng
}
