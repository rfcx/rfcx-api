var fs = require('fs')

exports.cachedFiles = {

  cacheDirectoryGarbageCollection: function () {
    var maxAgeInMinutes = 20

    var tmpDir = process.env.CACHE_DIRECTORY
    var subDir = 'uploads'

    if (fs.existsSync(tmpDir + '/' + subDir)) {
      fs.readdir(tmpDir + '/' + subDir, function (err, dirName) {
        if (err) {
          console.error('cacheDirectoryGarbageCollection readdir', err)
          return
        }
        dirName.forEach(function (innerFileName) {
          fs.stat(tmpDir + '/' + subDir + '/' + innerFileName, function (err, fileStats) {
            if (err) {
              console.error('cacheDirectoryGarbageCollection stat', err)
              return
            }
            if ((((new Date()).valueOf() - fileStats.mtime.valueOf()) / 60000) > maxAgeInMinutes) {
              fs.unlink(tmpDir + '/' + subDir + '/' + innerFileName, function (err) {
                if (err) {
                  console.error('cacheDirectoryGarbageCollection unlink', err)
                }
              })
            }
          })
        })
      })
    }
  }

}
