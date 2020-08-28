var Promise = require('bluebird')
var fs = require('fs')

exports.audioUtils = {

  serveAudioFromFile: function (res, filePathToServe, fileName, mimeType, inline, additionalHeaders) {
    return new Promise(function (resolve, reject) {
      try {
        fs.stat(filePathToServe, function (statErr, audioFileStat) {
          if (statErr == null) {
            const headers = {
              'Content-Type': mimeType,
              'Content-Length': audioFileStat.size,
              'Accept-Ranges': `bytes 0-${audioFileStat.size - 1}/${audioFileStat.size}`,
              'Content-Disposition': `attachment; filename=${fileName}`,
              'Cache-Control': 'max-age=600'
            }
            if (additionalHeaders) {
              for (const key in additionalHeaders) {
                headers[key] = additionalHeaders[key]
              }
            }

            // if we'd like to play audio in browser instead of downloading it
            if (inline) {
              delete headers['Content-Disposition']
            }

            res.writeHead(200, headers)

            fs.createReadStream(filePathToServe)
              .on('end', function () {
                res.end()
                resolve(null)
                fs.unlink(filePathToServe, function (e) { if (e) { console.log(e) } })
              })
              .pipe(res, { end: true })
          } else {
            console.log('Audio file not found...')
            reject(new Error())
          }
        })
      } catch (err) {
        console.log('failed to serve audio file | ' + err)
        reject(new Error(err))
      }
    })
  }

}
