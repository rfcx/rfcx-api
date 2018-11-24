var Promise = require("bluebird");
var fs = require("fs");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();

exports.audioUtils = {

    cacheSourceAudio: function(s3Url) {
        return new Promise(function(resolve, reject) {
            try {

                var s3NoProtocol = s3Url.substr(s3Url.indexOf("://")+3),
                    s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
                    s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),

                    hashName = hash.randomString(32),
                    audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf(".")),
                    sourceFilePath = process.env.CACHE_DIRECTORY+"ffmpeg/"+hashName+"."+audioFileExtension;

                aws.s3(s3Bucket).get(s3Path)
                  .on("response", function(s3Res){
                    var tempWriteStream = fs.createWriteStream(sourceFilePath);
                    tempWriteStream.on("error", function(err){ console.log(err); });
                    s3Res.on("data", function(data){ tempWriteStream.write(data); });
                    s3Res.on("end", function(){ tempWriteStream.end(); });
                    s3Res.on("error", function(err){ console.log(err); });
                    tempWriteStream.on("finish", function(){
                        fs.stat(sourceFilePath, function(statErr,fileStat){
                            if (statErr == null) {
                                resolve({ sourceFilePath, headers: s3Res.headers });
                            } else {
                                console.log("Audio file not found...");
                                reject(new Error());
                            }
                        });
                    });
                  }).end();

            } catch(err) {
                console.log("failed to download audio from s3 | " + err);
                reject(new Error(err));
            }
        }.bind(this));
    }


};

