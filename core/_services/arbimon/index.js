const rp = require('request-promise')
const moment = require('moment')
const arbimonBaseUrl = process.env.ARBIMON_BASE_URL
const { rpErrorHandler } = require('../../../common/error-handling/http')
const { getSegmentRemotePath } = require('../../stream-segments/bl/segment-file-utils')
const { getClientToken } = require('../../../common/auth0')

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

  return rp(options).catch(rpErrorHandler)
}

function createSite (stream, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude'].forEach((attr) => { body[attr] = stream[attr] })
  body.external_id = stream.id
  if (!body.altitude) {
    body.altitude = 0
  }
  if (stream.projectId) {
    body.project_external_id = stream.projectId
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

  return rp(options).catch(rpErrorHandler)
}

function updateSite (opts, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude', 'project_id'].forEach((attr) => { body[attr] = opts[attr] })
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

  return rp(options).catch(rpErrorHandler)
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

  return rp(options).catch(rpErrorHandler)
}

function parseStreamSourceFileMeta (sfParams) {
  let meta = {}
  if (sfParams.meta) {
    try {
      meta = JSON.parse(sfParams.meta)
    } catch (err) {
      console.error('Can not parse stream source file meta as object', err)
    }
  }
  meta.filename = sfParams.filename
  return JSON.stringify(meta)
}

function matchSegmentToRecording (sfParams, segment) {
  return {
    site_external_id: segment.stream_id,
    uri: getSegmentRemotePath(segment),
    datetime: moment.utc(segment.start).format('YYYY-MM-DD HH:mm:ss.SSS'),
    duration: (segment.end - segment.start) / 1000,
    samples: segment.sample_count,
    file_size: 0,
    bit_rate: sfParams.bit_rate,
    sample_rate: sfParams.sample_rate,
    sample_encoding: sfParams.audio_codec,
    meta: parseStreamSourceFileMeta(sfParams),
    precision: 0
  }
}

function createRecordings (body) {
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/ingest/recordings/create`,
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    json: true,
    timeout: 59000
  }

  return getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`
      return rp(options).catch(rpErrorHandler)
    })
    .then((response) => {
      if (response !== 'Created') {
        console.error(`arbimon createRecordings: req: ${JSON.stringify(body)} res: ${JSON.stringify(response)}`)
        throw Error('Unable to create recordings in Arbimon')
      }
    })
}

async function createRecordingsFromSegments (sfParams, segments, opts) {
  const recordings = segments.map((segment) => {
    return matchSegmentToRecording(sfParams, segment, opts)
  })
  return createRecordings(recordings)
}

async function deleteRecordingsFromSegments (streamId, segments) {
  const body = segments.map(s => {
    return {
      site_external_id: streamId,
      uri: s.path
    }
  })
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/ingest/recordings/delete`,
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    json: true,
    timeout: 59000
  }

  return getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`
      return rp(options).catch(rpErrorHandler)
    })
    .then((response) => {
      if (response) {
        console.error(`arbimon deleteRecordings: req: ${JSON.stringify(body)} res: ${JSON.stringify(response)}`)
        throw Error('Unable to delete recordings in Arbimon')
      }
    })
}

function createUser (user, idToken) {
  const body = {};
  ['firstname', 'lastname', 'email', 'guid', 'user_id', 'picture'].forEach((attr) => { body[attr] = user[attr] })
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/integration/users`,
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`
      return rp(options).catch(rpErrorHandler)
    })
}

module.exports = {
  isEnabled,
  createProject,
  createSite,
  updateSite,
  deleteSite,
  matchSegmentToRecording,
  createRecordingsFromSegments,
  deleteRecordingsFromSegments,
  createRecordings,
  createUser
}
