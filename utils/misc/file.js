const Promise = require('bluebird')
const fs = require('fs')
const assetUtil = require('../internal-rfcx/asset-utils').assetUtils

function serveFile (res, filePathToServe, fileName, mimeType, inline) {
  return new Promise((resolve, reject) => {
    try {
      fs.stat(filePathToServe, (err, stat) => {
        if (err) {
          reject(err)
        } else {
          const headers = {
            'Content-Type': mimeType,
            'Content-Length': stat.size,
            'Accept-Ranges': `bytes 0-${stat.size - 1}/${stat.size}`,
            'Content-Disposition': `attachment; filename=${fileName}`,
            'Cache-Control': 'max-age=600'
          }

          // if we'd like to open file in browser instead of downloading it
          if (inline) {
            delete headers['Content-Disposition']
          }

          res.writeHead(200, headers)

          fs.createReadStream(filePathToServe)
            .on('end', () => {
              res.end()
              resolve()
              fs.unlink(filePathToServe, (err) => {
                if (err) {
                  console.error(`Failed to remove local file ${filePathToServe}`, err)
                }
              })
            })
            .pipe(res, { end: true })
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Removes local files which were downloaded from request
 * @param {Object | Array} files - pass req.files here
 */
function removeReqFiles (files) {
  let filesArr = []
  try {
    filesArr = Array.isArray(files.file) ? files.file : [files.file]
  } catch (e) { }
  filesArr.forEach((file) => {
    assetUtil.deleteLocalFileFromFileSystem(file.path)
  })
  filesArr = null
}

module.exports = {
  serveFile,
  removeReqFiles
}
