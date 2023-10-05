const wc = require('which-country')
const { ValidationError } = require('../../../common/error-handling/errors')

function getCountryCodeByLatLng (latitude, longitude) {
  try {
    // pass [lng, lat]
    return wc([longitude, latitude])
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getCountryCodeByLatLng
}
