const rp = require('request-promise')
const arbimonBaseUrl = process.env.ARBIMON_BASE_URL
const { rpErrorMatcher } = require('../../utils/http-error-handler')

const isEnabled = `${process.env.ARBIMON_ENABLED}` === 'true'

function createProject (project, idToken) {
  const body = {};
  ['name', 'description'].forEach((attr) => { body[attr] = project[attr] })
  body.is_private = !project.is_public
  body.external_id = project.id
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/integration/projects`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(e => { throw rpErrorMatcher(e) })
}

function createSite (stream, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude'].forEach((attr) => { body[attr] = stream[attr] })
  body.external_id = stream.id
  if (body.altitude === undefined) {
    body.altitude = 0
  }
  if (stream.project && stream.project.id) {
    body.project_external_id = stream.project.id
  }
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/integration/sites`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(e => { throw rpErrorMatcher(e) })
}

function updateSite (opts, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude'].forEach((attr) => { body[attr] = opts[attr] })
  const options = {
    method: 'PATCH',
    url: `${arbimonBaseUrl}api/integration/sites/${opts.id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(e => { throw rpErrorMatcher(e) })
}

function deleteSite (id, idToken) {
  const options = {
    method: 'DELETE',
    url: `${arbimonBaseUrl}api/integration/sites/${id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    json: true
  }

  return rp(options).catch(e => { throw rpErrorMatcher(e) })
}

module.exports = {
  isEnabled,
  createProject,
  createSite,
  updateSite,
  deleteSite
}
