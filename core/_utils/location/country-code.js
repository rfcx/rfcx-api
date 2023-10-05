const iso1A3Code = require('@rapideditor/country-coder').iso1A3Code

function getCountryCodeByLatLng (latitude, longitude) {
  // pass [lng, lat]
  return iso1A3Code([longitude, latitude])
}

module.exports = {
  getCountryCodeByLatLng
}
