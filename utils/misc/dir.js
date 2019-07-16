const guid = require('../../utils/misc/guid');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

function createTempDir(cacheSubDir) {
  cacheSubDir = cacheSubDir || 'random';
  return new Promise((resolve, reject) => {
    try {
      let tempName = guid.generate(); // temporary path
      let cacheSubDirPath = path.join(process.env.CACHE_DIRECTORY, cacheSubDir);
      if (!fs.existsSync(cacheSubDirPath)) {
        fs.mkdirSync(cacheSubDirPath);
      }
      let dir = path.join(cacheSubDirPath, tempName);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      resolve(dir);
    }
    catch (e) {
      reject(e);
    }
  })
}

function ensureDirExists(dirPath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
      }
      resolve();
    }
    catch (e) {
      reject(e);
    }
  });
}

function removeDirRecursively(path) {
  return new Promise((resolve, reject) => {
    rimraf(path, (err) => {
      if (err) {
        reject(err);
      }
      else {
        resolve();
      }
    });
  })
}

module.exports = {
  createTempDir,
  ensureDirExists,
  removeDirRecursively
}
