const rp = require('request-promise')
const baseUrl = process.env.EARTHRANGER_BASE_URL
const token = process.env.EARTHRANGER_ACCESS_TOKEN

function createEvent (body) {
  const options = {
    method: 'POST',
    url: `${baseUrl}api/v1.0/activity/events`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }
  return rp(options)
}

module.exports = {
  createEvent
}