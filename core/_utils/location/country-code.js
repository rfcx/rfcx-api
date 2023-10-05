const iso1A3Code = require('@rapideditor/country-coder').iso1A3Code
const { ValidationError } = require('../../../common/error-handling/errors')

function getCountryCodeByLatLng (latitude, longitude) {
  try {
    // pass [lng, lat]
    return iso1A3Code([longitude, latitude])
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getCountryCodeByLatLng
}
