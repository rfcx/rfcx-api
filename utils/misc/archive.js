const fs = require('fs')
const Promise = require('bluebird')
const archiver = require('archiver')
const path = require('path')

function archiveLocalFiles (zipPath, zipName, filesPaths) {
  return new Promise((resolve, reject) => {
    const zipFullPath = path.join(zipPath, zipName)
    const output = fs.createWriteStream(zipFullPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    output.on('close', () => {
      resolve(zipFullPath)
    })
    archive.on('warning', (err) => {
      reject(err)
    })
    archive.on('error', (err) => {
      reject(err)
    })
    archive.pipe(output)
    filesPaths.forEach((filePath) => {
      archive.file(filePath, { name: path.basename(filePath) })
    })
    archive.finalize()
  })
}

function archiveStrings (zipPath, zipName, files) {
  return new Promise((resolve, reject) => {
    const zipFullPath = path.join(zipPath, zipName)
    const output = fs.createWriteStream(zipFullPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    output.on('close', () => {
      resolve(zipFullPath)
    })
    archive.on('warning', (err) => {
      reject(err)
    })
    archive.on('error', (err) => {
      reject(err)
    })
    archive.pipe(output)
    files.forEach((file) => {
      archive.append(file.content, { name: file.name })
    })
    archive.finalize()
  })
}

module.exports = {
  archiveLocalFiles,
  archiveStrings
}
