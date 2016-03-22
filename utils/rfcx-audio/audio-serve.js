var Promise = require("bluebird");
var fs = require("fs");
function getAudioFormatMeta() { return require("../rfcx-audio").audioUtils.formats; }

exports.audioUtils = {

    serveTranscodedAudio: function(res,ffmpegObj,fileName) {

        return new Promise(function(resolve, reject) {
            try {

                res.writeHead(200, {
                  "Content-Type": getAudioFormatMeta()[fileName.substr(fileName.lastIndexOf(".")+1)].mime,
                  //"Content-Length": contentLength,
                  //"Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
                  "Cache-Control": "max-age=600",
                  "Content-Disposition": "filename="+fileName
                });

                ffmpegObj
                    .on("end",function(){
                      res.end();
                      resolve(null);
                    })
                    .pipe(res, { end: true });

            } catch(err) {
                console.log("failed to serve transcoded audio | " + err);
                reject(new Error(err));
            }
        }.bind(this));

    },

    serveTranscodedAudioFromFile: function(res,filePathToServe,fileName) {

        return new Promise(function(resolve, reject) {
            try {
                var contentLength = fs.statSync(filePathToServe).size;

                res.writeHead(200, {
                  "Content-Type": getAudioFormatMeta()[fileName.substr(fileName.lastIndexOf(".")+1)].mime,
                  "Content-Length": contentLength,
         //         "Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
                  "Cache-Control": "max-age=600",
                  "Content-Disposition": "filename="+fileName
                });

                var audioFileStream = fs.createReadStream(filePathToServe);

                audioFileStream
                  .on("end",function(){
                    res.end();
                    fs.unlink(filePathToServe,function(e){if(e){console.log(e);}});
                    resolve(null);
                  })
                  .pipe(res, { end: true });

            } catch(err) {
                console.log("failed to serve transcoded audio file | " + err);
                reject(new Error(err));
            }
        }.bind(this));

    }


};

