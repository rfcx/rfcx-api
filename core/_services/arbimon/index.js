const rp = require('request-promise')
const moment = require('moment')
const arbimonBaseUrl = process.env.ARBIMON_BASE_URL
const arbimonAPIPrefix = process.env.ARBIMON_API_PREFIX
const { rpErrorHandler } = require('../../../common/error-handling/http')
const { calcSegmentPath } = require('../../stream-segments/bl/segment-file-utils')
const { getClientToken } = require('../../../common/auth0')

const isEnabled = `${process.env.ARBIMON_ENABLED}` === 'true'

function createProject (project, idToken) {
  const body = {};
  ['name', 'description'].forEach((attr) => { body[attr] = project[attr] })
  body.is_private = !project.isPublic
  body.external_id = project.id
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/projects`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }
  return rp(options).catch(rpErrorHandler())
}

function updateProject (opts, idToken) {
  const body = {};
  ['name', 'description'].forEach((attr) => { body[attr] = opts[attr] })
  const options = {
    method: 'PATCH',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/projects/${opts.id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(rpErrorHandler())
}

function createSite (stream, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude', 'hidden', 'timezone', 'country_code'].forEach((attr) => { body[attr] = stream[attr] })
  body.external_id = stream.id
  if (!body.altitude) {
    body.altitude = 0
  }
  if (stream.projectId) {
    body.project_external_id = stream.projectId
  }
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/sites`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(rpErrorHandler())
}

function updateSite (opts, idToken) {
  const body = {};
  ['name', 'latitude', 'longitude', 'altitude', 'project_id', 'hidden'].forEach((attr) => { body[attr] = opts[attr] })
  const options = {
    method: 'PATCH',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/sites/${opts.id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return rp(options).catch(rpErrorHandler())
}

function deleteSite (id, idToken) {
  const options = {
    method: 'DELETE',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/sites/${id}`,
    headers: {
      Authorization: idToken,
      'Content-Type': 'application/json'
    },
    json: true
  }

  return rp(options).catch(rpErrorHandler())
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
    uri: calcSegmentPath(segment),
    datetime: moment.utc(segment.start).format('YYYY-MM-DD HH:mm:ss.SSS'),
    duration: (segment.end - segment.start) / 1000,
    samples: segment.sample_count,
    // Regression fix (2026-08-21): this was `segment.file_size` until
    // fc6049135 (2023-07-22, "create and update files in batches"), which
    // switched segment creation to bulkCreate with a narrow `returning` set.
    // file_size is not a stream_segments column, so it stopped surviving the
    // round trip and was hardcoded to 0 -- meaning EVERY Arbimon recording
    // created through the ingest endpoint since that date carries file_size=0
    // (verified live: a site uploading continuously across the commit date
    // flips from 0/6661 zero-byte rows the week before to 6659/6659 the week
    // after). The caller now carries the validated value across the
    // bulkCreate, so honour it again, defaulting to 0 when genuinely absent.
    file_size: segment.file_size || 0,
    bit_rate: sfParams.bit_rate,
    sample_rate: sfParams.sample_rate,
    sample_encoding: sfParams.audio_codec,
    meta: parseStreamSourceFileMeta(sfParams),
    precision: 0
  }
}

/**
 * True only for failures where the request provably NEVER REACHED the server,
 * so a retry cannot double-apply.
 *
 * Measured 2026-08-26: node >= 20 clients pool keep-alive sockets
 * (globalAgent.keepAlive=true) while arbimon-legacy's bin/www uses Node's
 * default 5s server keepAliveTimeout — so ~1% of calls hit the classic race
 * where the server closes an idle socket exactly as we reuse it, surfacing as
 * ECONNRESET on a reused socket. Reproduced deterministically in a live
 * core-api pod (idle ~4.5s -> reuse -> ECONNRESET, while back-to-back calls
 * all reused sockets happily).
 *
 * DELIBERATELY EXCLUDED: timeouts (ESOCKETTIMEDOUT/ETIMEDOUT). A timeout is
 * AMBIGUOUS — the insert may have committed after we gave up, and arbimon2's
 * `recordings` table has NO unique key (PK only, verified live), so a blind
 * re-send would create a duplicate recording row rather than erroring.
 */
function isRetryableTransportError (err) {
  if (!err) { return false }
  const cause = err.cause || err
  const code = cause.code || err.code
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') { return true }
  return /socket hang up|ECONNRESET|ECONNREFUSED/.test(`${err.message}`)
}

/** The bare HTTP call: resolves with the response body, no retry logic. */
function postRecordingsOnce (body) {
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}ingest/recordings/create`,
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
      return rp(options)
    })
}

function createRecordings (body) {
  return postRecordingsOnce(body)
    .catch((err) => {
      // One retry, connection-level failures only (see the guard above for why
      // timeouts must NOT be retried). The retry opens a FRESH socket — the
      // agent discards a socket that just RST — so it cannot hit the same
      // race twice.
      if (isRetryableTransportError(err)) {
        console.warn(`arbimon createRecordings: transport error (${err.code || err.message}); retrying once on a fresh connection`)
        return postRecordingsOnce(body)
      }
      throw err
    })
    .catch(rpErrorHandler())
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
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}ingest/recordings/delete`,
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
      return rp(options).catch(rpErrorHandler())
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
    url: `${arbimonBaseUrl}${arbimonAPIPrefix}integration/users`,
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`
      return rp(options).catch(rpErrorHandler())
    })
}

module.exports = {
  isEnabled,
  createProject,
  updateProject,
  createSite,
  updateSite,
  deleteSite,
  matchSegmentToRecording,
  createRecordingsFromSegments,
  deleteRecordingsFromSegments,
  createRecordings,
  createUser,
  // exported for unit tests: the retry decision must stay pinned to
  // connection-level-only failures (never timeouts -- see its docblock)
  isRetryableTransportError
}
