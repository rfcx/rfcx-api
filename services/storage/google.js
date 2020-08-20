const { Storage } = require('@google-cloud/storage')
const storage = new Storage()

function getSignedUrl (bucket, key, contentType, expires = 86400) {
  // Get a reference to the destination file in GCS
  const file = storage.bucket(bucket).file(key)

  // Create a temporary upload URL
  const expiresAtMs = Date.now() + expires * 1000
  const config = {
    action: 'write',
    expires: expiresAtMs,
    contentType,
  }
  return file
    .getSignedUrl(config)
    .then(data => data[0])
}

function exists(bucket, key) {
  const file = storage.bucket(bucket).file(key)
  return file
    .exists()
    .then(data => data[0]);
}

async function listFiles(bucket, path) {
  const data = await storage.bucket(bucket).getFiles({ prefix: path })
  return data[0]
}

function getFilePath(file) {
  return file.metadata.name
}

function download (bucket, remotePath, localPath) {
  return storage.bucket(bucket).file(remotePath).download({ destination: localPath })
}

function getReadStream(bucket, key) {
  return storage.bucket(bucket).file(key).createReadStream()
}

function upload(bucket, key, localPath) {
  return storage.bucket(bucket).upload(localPath, { destination: key });
}

function uploadBuffer(bucket, key, buffer) {
  return storage.bucket(bucket).file(key).save(buffer);
}

function deleteFile(bucket, key) {
  return storage.bucket(bucket).file(key).delete();
}

async function deleteFiles(bucket, keys) {
  for (let key of keys) {
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
  upload,
  uploadBuffer,
  deleteFile,
  deleteFiles,
}
