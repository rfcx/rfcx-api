var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var exec = require("child_process").exec;
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var audioUtils = require("../../../utils/rfcx-audio").audioUtils;
function getAllViews() { return require("../../../views/v1"); }


exports.models = {

  guardianAudioFile: function(req,res,dbRows) {

    var dbRow = dbRows,
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf("."));
        ;

      aws.s3(s3Bucket).getFile(s3Path, function(err, result){
        if(err) { return next(err); }

        // this next line may not be necessary
        result.resume();
        
        var contentLength = parseInt(result.headers["content-length"]);
        
        res.writeHead(  200, {
          "Content-Length": contentLength,
          "Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
          "Content-Type": result.headers["content-type"],
          "Content-Disposition": "filename="+dbRow.guid+"."+audioFileExtension
        });

        result.pipe(res);      
      });
  },

// TEST
  TEMP_MP3_guardianAudioFile: function(req,res,dbRows) {

    var dbRow = dbRows;

    audioUtils.cacheSourceAudio(dbRow.url)
      .then(function(sourceFilePath){
          audioUtils.transcodeToMP3({
              sourceFilePath: sourceFilePath,
              enhanced: true,
              bitRate: "32k",
              sampleRate: dbRow.capture_sample_rate
            }).then(function(ffmpegObj){
              audioUtils.serveTranscodedAudio(res,ffmpegObj,dbRow.guid+".mp3")
                .then(function(){
                  fs.unlink(sourceFilePath,function(e){if(e){console.log(e);}});
                }).catch(function(err){
                  console.log(err);
                });
            }).catch(function(err){
              console.log(err);
            });
        }).catch(function(err){
          console.log(err);
          res.status(500).json({msg:"failed to transcode audio"});
        });

  },
// TEST
  TEMP_OGG_guardianAudioFile: function(req,res,dbRows) {

    var dbRow = dbRows;

    audioUtils.cacheSourceAudio(dbRow.url)
      .then(function(sourceFilePath){
          audioUtils.transcodeToOpus({
              sourceFilePath: sourceFilePath,
              enhanced: false,
              bitRate: "16k",
              sampleRate: dbRow.capture_sample_rate
            }).then(function(ffmpegObj){
              audioUtils.serveTranscodedAudio(res,ffmpegObj,dbRow.guid+".opus")
                .then(function(){
                  fs.unlink(sourceFilePath,function(e){if(e){console.log(e);}});
                }).catch(function(err){
                  console.log(err);
                });
            }).catch(function(err){
              console.log(err);
            });
        }).catch(function(err){
          console.log(err);
          res.status(500).json({msg:"failed to transcode audio"});
        });

  },

  guardianSpectrogramFile: function(req,res,dbRows) {

    var dbRow = dbRows,
        hashName = hash.randomString(32),
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf(".")),
        audioFilePath = process.env.FFMPEG_CACHE_DIRECTORY+hashName+"."+audioFileExtension,
        specFilePath = process.env.FFMPEG_CACHE_DIRECTORY+hashName+".png",
        specSettings = { 
          specWidth: 2048, specHeight: 512, 
          windowFunc: "Dolph", // Hann Hamming Bartlett Rectangular Kaiser Dolph
          zAxis: 95, // color range in dB, ranging from 20 to 180
          clipDuration: dbRow.duration,
          audioSampleRate: (dbRow.capture_sample_rate != null) ? dbRow.capture_sample_rate : 8000
        };

    var ffmpegSox = process.env.FFMPEG_PATH+" -i "+audioFilePath+" -loglevel panic -nostdin"
                  +" -ac 1 -ar "+specSettings.audioSampleRate
                  +" -f sox - "
                  +" | "
                  +" "+process.env.SOX_PATH+" -t sox - -n spectrogram -h -r -o "+specFilePath
                  +" -x "+specSettings.specWidth+" -y "+specSettings.specHeight
                  +" -w "+specSettings.windowFunc+" -z "+specSettings.zAxis+" -s -d "+((specSettings.clipDuration)/1000);

    aws.s3(s3Bucket).get(s3Path)
      .on("response", function(s3Res){
        var audioWriteStream = fs.createWriteStream(audioFilePath);
        audioWriteStream.on("error", function(err){ console.log(err); res.status(500).json({msg:err}); });
        s3Res.on("data", function(data){ audioWriteStream.write(data); });
        s3Res.on("end", function(){ audioWriteStream.end(); });
        s3Res.on("error", function(err){ console.log(err); res.status(500).json({msg:err}); });
        audioWriteStream.on("finish", function(){ 
          if (fs.existsSync(audioFilePath)) {
            exec(ffmpegSox, function(err,stdout,stderr){
              if (stderr.trim().length > 0) { console.log(stderr); }
              if (!!err) { console.log(err); }
              if (fs.existsSync(specFilePath)) {

                res.writeHead(200, {
                  "Content-Type": "image/png",
                  //"Content-Length": contentLength,
                  //"Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
                  "Content-Disposition": "filename="+dbRow.guid+".png"
                });
                var specStream = fs.createReadStream(specFilePath);
                specStream.pipe(res);
              } else {
                res.status(500).json({});
              }
             fs.unlink(specFilePath,function(e){if(e){console.log(e);}});
             fs.unlink(audioFilePath,function(e){if(e){console.log(e);}});
            });

          } else {
            console.log("Source audio not accessible...");
            res.status(500).json({msg:"Source audio not accessible..."});
          }
        });
      }).end();

  },

  guardianAudio: function(req,res,dbRows,PARENT_GUID) {

    var views = getAllViews();

    if (!util.isArray(dbRows)) { dbRows = [dbRows]; }
    
    var jsonArray = [], jsonRowsByGuid = {}, dbRowsByGuid = {};

    return new Promise(function(resolve,reject){

        for (i in dbRows) {

          var thisRow = dbRows[i], thisGuid = thisRow.guid;

          dbRowsByGuid[thisGuid] = thisRow;

          jsonRowsByGuid[thisGuid] = {
            guid: thisGuid,
            measured_at: thisRow.measured_at,
            analyzed_at: thisRow.analyzed_at,
            size: thisRow.size,
            duration: thisRow.duration,
            format: thisRow.capture_format,
            bitrate: thisRow.capture_bitrate,
            sample_rate: thisRow.capture_sample_rate,
            sha1_checksum: thisRow.sha1_checksum,
            spectrogram: null
          };

          if (thisRow.Site != null) { jsonRowsByGuid[thisGuid].site_guid = thisRow.Site.guid; }
          if (thisRow.Guardian != null) { jsonRowsByGuid[thisGuid].guardian_guid = thisRow.Guardian.guid; }
          if (thisRow.CheckIn != null) { jsonRowsByGuid[thisGuid].checkin_guid = thisRow.CheckIn.guid; }

          if (PARENT_GUID != null) { jsonRowsByGuid[thisGuid].PARENT_GUID = PARENT_GUID; }

          token.createAnonymousToken({
            reference_tag: thisGuid,
            token_type: "audio-file",
            minutes_until_expiration: 30,
            created_by: null,
            allow_garbage_collection: false,
            only_allow_access_to: [
              "^/v1/assets/audio/"+thisGuid+"."+thisRow.url.substr(1+thisRow.url.lastIndexOf("."))+"$",
              "^/v1/assets/audio/"+thisGuid+".png$"
              ]
          }).then(function(tokenInfo){
              try {

                var thisRow = dbRowsByGuid[tokenInfo.reference_tag], thisGuid = thisRow.guid,
                    urlBase = process.env.ASSET_URLBASE+"/audio/"+thisGuid,
                    urlAuthParams = "?auth_user=token/"+tokenInfo.token_guid
                                  +"&auth_token="+tokenInfo.token
                                  +"&auth_expires_at="+tokenInfo.token_expires_at.toISOString();

                jsonRowsByGuid[thisGuid].url = urlBase+"."+thisRow.url.substr(1+thisRow.url.lastIndexOf("."));
                
                // in case we just prefer to use S3 signed URLs (safari is having problems, for example)
                // var s3NoProtocol = thisRow.url.substr(thisRow.url.indexOf("://")+3),
                //     s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
                //     s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"));
                // jsonRowsByGuid[thisGuid].url = aws.s3SignedUrl(s3Bucket, s3Path, 30);

                jsonRowsByGuid[thisGuid].spectrogram = urlBase+".png";//+urlAuthParams;

                jsonRowsByGuid[thisGuid].urls = {
                  m4a: urlBase+".m4a",
                  mp3: urlBase+".mp3",
                  opus: urlBase+".opus",
                  png: urlBase+".png"
                };

                jsonRowsByGuid[thisGuid].urls_expire_at = tokenInfo.token_expires_at;

                jsonArray.push(jsonRowsByGuid[thisGuid]);
                if (jsonArray.length == dbRows.length) { resolve(jsonArray); }
                
              } catch (e) {
                reject(e);
              }
          }).catch(function(err){
              console.log("failed to create anonymous token | "+err);
              reject(new Error(err));
          });
        }
    });
  
  },


};

