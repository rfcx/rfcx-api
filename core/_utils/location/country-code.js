const featuresIn = require('@rapideditor/country-coder').featuresIn
const googleMap = require('../../_services/google')

async function getCountryCodeByLatLng (latitude, longitude) {
  const isLatDefined = latitude !== null && latitude !== undefined
  const isLngDefined = longitude !== null && longitude !== undefined
  if (!isLatDefined || !isLngDefined) { return null }
  const result = (await googleMap.getCountry(latitude, longitude)).data.results[0]
  if (result) {
    return result.address_components[0].short_name
  }
  return null
}

function getCountryNameByCode (code) {
  try {
    return featuresIn(code)[0].properties.nameEn
  } catch (e) {
    return null
  }
}

module.exports = {
  getCountryCodeByLatLng,
  getCountryNameByCode
}
