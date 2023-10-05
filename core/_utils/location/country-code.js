const wc = require('which-country')
const { ValidationError } = require('../../../common/error-handling/errors')

function getCountryCodeByLatLng (latitude, longitude) {
  try {
    return wc(latitude, longitude)
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getCountryCodeByLatLng
}
