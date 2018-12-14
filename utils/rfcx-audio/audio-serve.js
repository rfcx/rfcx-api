var Promise = require("bluebird");
var fs = require("fs");

exports.audioUtils = {

    serveAudioFromFile: function(res,filePathToServe,fileName,mimeType) {

        return new Promise(function(resolve, reject) {
            try {

              fs.stat(filePathToServe, function(statErr,audioFileStat){

                if (statErr == null) {

                  res.writeHead(200, {
                    "Content-Type": mimeType,
                    "Content-Length": audioFileStat.size,
                    "Accept-Ranges": "bytes 0-"+(audioFileStat.size-1)+"/"+audioFileStat.size,
            //        "Content-Disposition": "attachment; filename="+fileName,    // this forces SaveAs/Download function in browser
                    "Cache-Control": "max-age=600"
                  });

                  fs.createReadStream(filePathToServe)
                    .on("end",function(){
                      res.end();
                      resolve(null);
                      fs.unlink(filePathToServe,function(e){if(e){console.log(e);}});
                    })
                    .pipe(res, { end: true });


                } else {
                    console.log("Audio file not found...");
                    reject(new Error());
                }
              });

            } catch(err) {
                console.log("failed to serve audio file | " + err);
                reject(new Error(err));
            }
        }.bind(this));

    }


};

