var fs = require("fs");

exports.cachedFiles = {

  cacheDirectoryGarbageCollection: function() {

    var maxAgeInMinutes = 20;

    var tmpDir = process.env.CACHE_DIRECTORY;
    var subDir = "uploads";

    if (fs.existsSync(tmpDir+"/"+subDir)) {
      fs.readdir(tmpDir+"/"+subDir, function (err, dirName) {
        dirName.forEach(function (innerFileName) {
          fs.stat(tmpDir+"/"+subDir+"/"+innerFileName, function (err, fileStats){
            if ((((new Date()).valueOf()-fileStats.mtime.valueOf())/60000) > maxAgeInMinutes) {
              fs.unlink(tmpDir+"/"+subDir+"/"+innerFileName,function(err){ if (err) console.log(err); });
            }
          });
        });
      });
    }

  }

};

