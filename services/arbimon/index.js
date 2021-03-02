const rp = require('request-promise')
const arbimonBaseUrl = process.env.ARBIMON_BASE_URL

function userProject (idToken) {
  const options = {
    method: 'GET',
    url: `${arbimonBaseUrl}api/ingest/user-project`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    json: true
  }

  return rp(options)
}

function createSite (opts, idToken) {
  const body = {};
  ['name', 'external_id', 'lat', 'lon', 'alt'].forEach((attr) => { body[attr] = opts[attr] })
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/ingest/project/${opts.project_id}/sites/create`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options)
}

function updateSite (opts, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude'].forEach((attr) => { body[attr] = opts[attr] })
  const options = {
    method: 'PATCH',
    url: `${arbimonBaseUrl}api/ingest/sites/${opts.id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options)
}

module.exports = {
  userProject,
  createSite,
  updateSite
}
