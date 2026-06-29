const { Storage } = require('@google-cloud/storage')
const storage = new Storage()

function getSignedUrl (bucket, key, contentType, expires = 86400, write = false) {
  // Get a reference to the destination file in GCS
  const file = storage.bucket(bucket).file(key)

  // Create a temporary download/upload URL
  const expiresAtMs = Date.now() + expires * 1000
  const config = {
    action: write ? 'write' : 'read',
    expires: expiresAtMs,
    contentType
  }
  return file
    .getSignedUrl(config)
    .then(data => data[0])
}

function exists (bucket, key) {
  const file = storage.bucket(bucket).file(key)
  return file
    .exists()
    .then(data => data[0])
}

async function listFiles (bucket, path) {
  const data = await storage.bucket(bucket).getFiles({ prefix: path })
  return data[0]
}

function getFilePath (file) {
  return file.metadata.name
}

function download (bucket, remotePath, localPath) {
  return storage.bucket(bucket).file(remotePath).download({ destination: localPath })
}

function getReadStream (bucket, key) {
  return storage.bucket(bucket).file(key).createReadStream()
}

// Single round-trip cache read parity with amazon.js (rfcx-local, 2026-06-29).
// Resolves a readable stream on hit, or null on miss (404) / error, so callers
// can avoid a separate exists() round-trip. GCS surfaces a missing object as a
// stream 'error' with code 404.
function getObjectStreamOrNull (bucket, key) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => { if (!settled) { settled = true; resolve(value) } }
    const stream = storage.bucket(bucket).file(key).createReadStream()
    stream.once('error', () => finish(null))
    stream.once('response', (resp) => {
      if (resp && resp.statusCode >= 200 && resp.statusCode < 300) {
        finish(stream)
      } else {
        stream.on('error', () => {})
        finish(null)
      }
    })
  })
}

function upload (bucket, key, localPath) {
  return storage.bucket(bucket).upload(localPath, { destination: key })
}

function uploadBuffer (bucket, key, buffer) {
  return storage.bucket(bucket).file(key).save(buffer)
}

function deleteFile (bucket, key) {
  return storage.bucket(bucket).file(key).delete()
}

async function deleteFiles (bucket, keys) {
  for (const key of keys) {
    await deleteFile(bucket, key)
  }
  return true
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
