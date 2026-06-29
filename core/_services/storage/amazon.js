const fs = require('fs')
const http = require('http')
const https = require('https')
// rfcx-local fork: route through the in-cluster s3-proxy (s3-reader/s3-writer
// chain) when AWS_S3_ENDPOINT is set; bit-identical to upstream (vanilla AWS)
// when unset. Endpoint/path-style wiring centralized in the shared
// @rfcx/s3-storage-client package. signatureVersion v4 is applied only when a
// custom endpoint is in play (preserving prior behavior).
const { createS3Client } = require('@rfcx/s3-storage-client')

// ---------------------------------------------------------------------------
// Connection reuse (rfcx-local, 2026-06-29). The AWS SDK v2 default HTTP agent
// does NOT keep connections alive, so every headObject/getObject/putObject pays
// a fresh TCP + TLS handshake. Against the in-cluster s3-proxy that handshake
// measured 20-70ms of every call (TLS dominant) -- and the streams-cache hit
// path issues a HEAD then a GET, so it paid it twice. A keep-alive agent
// amortises the handshake across the pool, which is the single biggest latency
// win on the UX-blocking spectrogram/segment serve path. maxSockets is bounded
// so a burst of concurrent spectrogram requests can't exhaust ephemeral ports.
// Tunable via S3_KEEPALIVE_MAX_SOCKETS (default 64).
const S3_KEEPALIVE_MAX_SOCKETS = parseInt(process.env.S3_KEEPALIVE_MAX_SOCKETS || '64', 10)
const keepAliveHttpAgent = new http.Agent({ keepAlive: true, maxSockets: S3_KEEPALIVE_MAX_SOCKETS })
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: S3_KEEPALIVE_MAX_SOCKETS })

// Pick the agent matching the configured endpoint scheme (https s3-proxy today;
// http if a plain-HTTP internal endpoint is ever configured). Falls back to the
// https agent for vanilla AWS (no custom endpoint).
function agentForEndpoint (endpoint) {
  return /^http:\/\//i.test(`${endpoint || ''}`) ? keepAliveHttpAgent : keepAliveHttpsAgent
}

const s3Client = createS3Client({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION_ID,
  extra: {
    httpOptions: { agent: agentForEndpoint(process.env.AWS_S3_ENDPOINT) },
    ...process.env.AWS_S3_ENDPOINT ? { signatureVersion: 'v4' } : {}
  }
})

// ---------------------------------------------------------------------------
// Dedicated streams-cache client (rfcx-local, 2026-06-29). The streams-cache
// bucket is an in-cluster-only result cache (regeneratable, no durable tier).
// The default s3Client must keep using AWS_S3_ENDPOINT (= https://s3.arbimon.org)
// because it ALSO mints public presigned browser URLs and serves the source
// `streams` bucket -- so we must NOT flip its endpoint globally. Instead, when
// STREAMS_CACHE_S3_ENDPOINT is set, cache-bucket reads/writes use a SEPARATE
// client pointed at that internal endpoint (e.g. a plain-HTTP in-cluster route
// to s3-reader/s3-writer), skipping the TLS hop entirely. Default-off: when the
// env var is unset, cacheS3Client === s3Client, so behaviour is unchanged until
// the internal route exists and the var is flipped.
const STREAMS_CACHE_S3_ENDPOINT = process.env.STREAMS_CACHE_S3_ENDPOINT
const cacheS3Client = STREAMS_CACHE_S3_ENDPOINT
  ? createS3Client({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION_ID,
    endpoint: STREAMS_CACHE_S3_ENDPOINT,
    forcePathStyle: true,
    extra: {
      signatureVersion: 'v4',
      httpOptions: { agent: agentForEndpoint(STREAMS_CACHE_S3_ENDPOINT) }
    }
  })
  : s3Client

// The streams-cache bucket name, so the read/write helpers can pick the right
// client without every caller passing it. Mirrors core/_services/storage index.
const STREAMS_CACHE_BUCKET = process.env.STREAMS_CACHE_BUCKET || 'rfcx-streams-cache-testing'

// Route a given bucket's operations to the cache client when it is the
// streams-cache bucket AND a dedicated cache endpoint is configured; otherwise
// the default client. Bucket-scoped on purpose: `upload` is also used for other
// buckets (e.g. classifier uploads), and download/deleteFiles target the source
// `streams` bucket -- those must stay on the default client.
function clientForBucket (Bucket) {
  return Bucket === STREAMS_CACHE_BUCKET ? cacheS3Client : s3Client
}

function getSignedUrl (bucket, key, contentType, expires = 86400, write = false) {
  const params = {
    Bucket: bucket,
    Key: key,
    Expires: expires,
    ContentType: contentType
  }
  const operation = write ? 'putObject' : 'getObject'
  return (new Promise((resolve, reject) => {
    s3Client.getSignedUrl(operation, params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  }))
}

function exists (Bucket, Key) {
  const client = clientForBucket(Bucket)
  return new Promise((resolve, reject) => {
    client.headObject({ Bucket, Key }, (headErr, data) => {
      return resolve(!headErr)
    })
  })
}

async function listFiles (Bucket, path) {
  const files = await clientForBucket(Bucket).listObjects({ Bucket, Prefix: path }).promise()
  return files.Contents
}

function getFilePath (file) {
  return file.Key
}

function download (Bucket, remotePath, localPath) {
  return new Promise((resolve, reject) => {
    try {
      s3Client.headObject({
        Bucket,
        Key: remotePath
      }, (headErr, data) => {
        if (headErr) { reject(headErr) }
        const tempWriteStream = fs.createWriteStream(localPath)
        const tempReadStream = s3Client.getObject({
          Bucket,
          Key: remotePath
        })
          .createReadStream()

        tempReadStream.on('error', (errS3Res) => { reject(errS3Res) })

        tempReadStream
          .pipe(tempWriteStream)
          .on('error', (errWrite) => { reject(errWrite) })
          .on('close', () => {
            fs.stat(localPath, (statErr, fileStat) => {
              if (statErr) { reject(statErr) } else { resolve() }
            })
          })
      })
    } catch (err) {
      reject(new Error(err))
    }
  })
}

function getReadStream (Bucket, Key) {
  return clientForBucket(Bucket)
    .getObject({ Bucket, Key })
    .createReadStream()
}

// Single round-trip cache read (rfcx-local, 2026-06-29). Resolves with a
// readable stream on a 2xx, or `null` when the object is absent (404/403) or
// the backend is unreachable -- both treated as a cache MISS by callers. This
// replaces the prior HEAD-then-GET pair on the hot serve path: one request
// instead of two, halving the cache-hit round-trips on the UX-blocking
// spectrogram/segment endpoint. We branch on the SDK v2 `httpHeaders` event so
// we never start writing the client response until we know it is a hit.
function getObjectStreamOrNull (Bucket, Key) {
  return new Promise((resolve) => {
    const req = clientForBucket(Bucket).getObject({ Bucket, Key })
    let settled = false
    const finish = (value) => { if (!settled) { settled = true; resolve(value) } }
    const stream = req.createReadStream()
    req.on('httpHeaders', (statusCode) => {
      if (statusCode >= 200 && statusCode < 300) {
        finish(stream)
      } else {
        // Miss (e.g. NoSuchKey -> 404). Discard the error body quietly so the
        // socket can be reused by the keep-alive pool, then report a miss.
        stream.on('error', () => {})
        stream.resume()
        finish(null)
      }
    })
    // Network-level failure before any headers (ECONNREFUSED, TLS, timeout):
    // fall back to regeneration rather than 500-ing the request.
    stream.on('error', () => finish(null))
  })
}

function upload (Bucket, Key, localPath) {
  const fileStream = fs.readFileSync(localPath)
  const opts = {
    Bucket,
    Key,
    Body: fileStream
  }
  return clientForBucket(Bucket).putObject(opts).promise()
}

function uploadBuffer (Bucket, Key, buffer) {
  const opts = {
    Bucket,
    Key,
    Body: buffer
  }
  return clientForBucket(Bucket).upload(opts).promise()
}

function deleteFile (Bucket, Key) {
  const opts = { Bucket, Key }
  return clientForBucket(Bucket).deleteObject(opts).promise()
}

function deleteFiles (Bucket, Keys) {
  const params = {
    Bucket,
    Delete: {
      Objects: Keys,
      Quiet: false
    }
  }
  return new Promise((resolve, reject) => {
    s3Client.deleteObjects(params, (err, data) => {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

module.exports = {
  getSignedUrl,
  exists,
  listFiles,
  getFilePath,
  download,
  getReadStream,
  getObjectStreamOrNull,
  upload,
  uploadBuffer,
  deleteFile,
  deleteFiles
}
