const tzlookup = require('tz-lookup')
const { ValidationError } = require('../../../common/error-handling/errors')

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
