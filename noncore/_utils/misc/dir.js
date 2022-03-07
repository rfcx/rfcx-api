const fs = require('fs')

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
  ensureDirExists
}
