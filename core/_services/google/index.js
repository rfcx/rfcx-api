const { Client } = require('@googlemaps/google-maps-services-js')

const client = new Client()
const GOOGLE_MAP_API_KEY = process.env.GOOGLE_MAP_API_KEY

async function getCountry (latitude, longitude) {
  const args = {
    params: {
      latlng: `${latitude},${longitude}`,
      result_type: 'country',
      key: GOOGLE_MAP_API_KEY
    }
  }

  return await client.geocode(args)
}

async function getTimezone (latitude, longitude) {
  const args = {
    params: {
      location: `${latitude},${longitude}`,
      timestamp: Date.now() / 1000, // need current timestamp in case it is daylight saving time
      key: GOOGLE_MAP_API_KEY
    }
  }

  return await client.timezone(args)
}

module.exports = {
  getCountry,
  getTimezone
}
