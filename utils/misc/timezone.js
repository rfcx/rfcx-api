const tzlookup = require('tz-lookup')
const ValidationError = require('../converter/validation-error')

function getTzByLatLng (latitude, longitude) {
  try {
    return tzlookup(latitude, longitude)
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getTzByLatLng
}
