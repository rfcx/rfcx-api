var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var token = require("../../../utils/internal-rfcx/token.js").token;
var audioUtils = require("../../../utils/internal-rfcx/token.js").token;
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

    var dbRow = dbRows,
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf("."));
        ;

      aws.s3("rfcx-ark").getFile("/test.mp3", function(err, result){
        if(err) { return next(err); }

        // this next line may not be necessary
        result.resume();
        
        var contentLength = parseInt(result.headers["content-length"]);
        
        res.writeHead(  200, {
          "Content-Length": contentLength,
          "Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
          "Content-Type": result.headers["content-type"],
          "Content-Disposition": "filename="+dbRow.guid+".mp3"
        });

        result.pipe(res);      
      });
  },
// TEST
  TEMP_OGG_guardianAudioFile: function(req,res,dbRows) {

    var dbRow = dbRows,
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf("."));
        ;

      aws.s3("rfcx-ark").getFile("/test.ogg", function(err, result){
        if(err) { return next(err); }

        // this next line may not be necessary
        result.resume();
        
        var contentLength = parseInt(result.headers["content-length"]);
        
        res.writeHead(  200, {
          "Content-Length": contentLength,
          "Accept-Ranges": "bytes 0-"+(contentLength-1)+"/"+contentLength,
          "Content-Type": result.headers["content-type"],
          "Content-Disposition": "filename="+dbRow.guid+".ogg"
        });

        result.pipe(res);      
      });
  },

  guardianSpectrogramFile: function(req,res,dbRows) {

    // var spawn = require('child_process').spawn;
    // res.writeHead(200, { "Content-Type": "image/png" });
    // var cat_child = spawn("cat", ["/Users/Shared/spec_.png"]);
    // req.connection.on("end", function() { cat_child.kill(); });
    // cat_child.stdout.on("data", function(data) { res.write(data); });

    var dbRow = dbRows;
    aws.s3("rfcx-meta").getFile("/trans.png", function(err, result){
      if(err) { return next(err); }
      // this next line may not be necessary
      result.resume();
      
      var contentLength = parseInt(result.headers["content-length"]);
      
      res.writeHead(  200, {
        "Content-Length": contentLength,
        "Content-Type": result.headers["content-type"],
        "Content-Disposition": "filename="+dbRow.guid+".png"
      });

      result.pipe(res);           
    });

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

                jsonRowsByGuid[thisGuid].spectrogram = urlBase+".png?v=3";//+urlAuthParams;

                jsonRowsByGuid[thisGuid].urls = {
                  m4a: urlBase+".m4a",
                  mp3: urlBase+".mp3",
                  ogg: urlBase+".ogg",
                  png: urlBase+".png?v=3"
                };

                //jsonRowsByGuid[thisGuid].url_expires_at = tokenInfo.token_expires_at;

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

