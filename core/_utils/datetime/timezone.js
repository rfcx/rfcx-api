const tz = require('geo-tz/all')
const googleMap = require('../../_services/google')
const { ValidationError } = require('../../../common/error-handling/errors')

async function getTzByLatLng (latitude, longitude) {
  try {
    const result = (await googleMap.getTimezone(latitude, longitude)).data.timeZoneId
    if (result) {
      return result
    }
    return tz.find(latitude, longitude)[0]
  } catch (err) {
    throw new ValidationError(err.message)
  }
}

module.exports = {
  getTzByLatLng
}
