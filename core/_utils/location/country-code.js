const iso1A3Code = require('@rapideditor/country-coder').iso1A3Code

function getCountryCodeByLatLng (latitude, longitude) {
  const isLatDefined = latitude !== null && latitude !== undefined
  const isLngDefined = longitude !== null && longitude !== undefined
  if (!isLatDefined || !isLngDefined) { return null }
  // pass [lng, lat]
  return iso1A3Code([longitude, latitude])
}

module.exports = {
  getCountryCodeByLatLng
}
