const rp = require('request-promise')
const moment = require('moment')
const arbimonBaseUrl = process.env.ARBIMON_BASE_URL
const { rpErrorMatcher } = require('../../utils/http-error-handler')
const { getSegmentRemotePath } = require('../streams/segment-file-utils')
const { StreamSegment, StreamSourceFile, AudioCodec, FileExtension } = require('../../modelsTimescale')
const { getClientToken } = require('../auth0/auth0-service')

const isEnabled = `${process.env.ARBIMON_ENABLED}` === 'true'

const segmentIncludes = [
  {
    model: StreamSourceFile,
    as: 'stream_source_file',
    attributes: StreamSourceFile.attributes.full,
    include: [
      {
        model: AudioCodec,
        as: 'audio_codec',
        attributes: AudioCodec.attributes.lite
      }
    ]
  },
  {
    model: FileExtension,
    as: 'file_extension',
    attributes: FileExtension.attributes.lite
  }
]

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


function matchSegmentToRecording (segment, opts = {}) {
  const transaction = opts.transaction || null
  return Promise.resolve()
    .then(() => {
      if (!segment.stream_source_file || !segment.stream_source_file.audio_codec) {
        return StreamSegment
          .findOne({
            where: { id: segment.id },
            attributes: StreamSegment.attributes.full,
            include: segmentIncludes,
            transaction
          })
          .then(item => {
            if (!item) {
              throw new EmptyResultError('Stream segment with given id not found.')
            }
            return item
          })
      }
      return segment
    })
    .then((data) => {
      return {
        site_external_id: data.stream_id,
        uri: getSegmentRemotePath(data), // !!!
        datetime: moment.utc(data.start).format('YYYY-MM-DD HH:mm:ss.SSS'),
        duration: (data.end - data.start) / 1000,
        samples: data.sample_count,
        file_size: segment.file_size, // !!!
        bit_rate: data.stream_source_file.bit_rate,
        sample_rate: data.stream_source_file.sample_rate,
        sample_encoding: data.stream_source_file.audio_codec.value, // !!!
        precision: 0
      }
    })
}

function createRecordings (body) {
  const options = {
    method: 'POST',
    url: `${arbimonBaseUrl}api/ingest/recordings/create`,
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }

  return getClientToken()
    .then((token) => {
      options.headers.authorization = `Bearer ${token}`
      return rp(options).catch(e => { throw rpErrorMatcher(e) })
    })
}

async function createRecordingsFromSegments (segments, opts) {
  const recordings = await Promise.all(segments.map((segment) => {
    return matchSegmentToRecording(segment, opts)
  }))
  return createRecordings(recordings)
}

module.exports = {
  isEnabled,
  createProject,
  createSite,
  updateSite,
  deleteSite,
  createRecordingsFromSegments
}
