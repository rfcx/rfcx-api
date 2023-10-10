const iso1A2Code = require('@rapideditor/country-coder').iso1A2Code
const featuresIn = require('@rapideditor/country-coder').featuresIn

function getCountryCodeByLatLng (latitude, longitude) {
  const isLatDefined = latitude !== null && latitude !== undefined
  const isLngDefined = longitude !== null && longitude !== undefined
  if (!isLatDefined || !isLngDefined) { return null }
  // pass [lng, lat]
  return iso1A2Code([longitude, latitude])
}

function getCountryNameByCode (code) {
  return featuresIn(code)[0] && featuresIn(code)[0].properties && featuresIn(code)[0].properties.nameEn ? featuresIn(code)[0].properties.nameEn : null
}

module.exports = {
  getCountryCodeByLatLng,
  getCountryNameByCode
}
