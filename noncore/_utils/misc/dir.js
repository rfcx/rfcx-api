const { randomGuid } = require('../../../common/crypto/random')
const Promise = require('bluebird')
const path = require('path')
const fs = require('fs')

function createTempDir (cacheSubDir) {
  cacheSubDir = cacheSubDir || 'random'
  return new Promise((resolve, reject) => {
    try {
      const tempName = randomGuid() // temporary path
      const cacheSubDirPath = path.join(process.env.CACHE_DIRECTORY, cacheSubDir)
      if (!fs.existsSync(cacheSubDirPath)) {
        fs.mkdirSync(cacheSubDirPath)
      }
      const dir = path.join(cacheSubDirPath, tempName)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }
      resolve(dir)
    } catch (e) {
      reject(e)
    }
  })
}

function ensureDirExists (dirPath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}

module.exports = {
  createTempDir,
  ensureDirExists
}
