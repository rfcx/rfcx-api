var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../misc/aws.js").aws();
var token = require("../../../misc/token.js").token;
function getAllViews() { return require("../../../views/v1"); }

exports.models = {

  guardianAudioFile: function(req,res,dbAudio) {

    var dbRow = dbAudio,
        s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
        s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
        s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/")),
        audioFileExtension = s3Path.substr(1+s3Path.lastIndexOf(".")),
        audioContentType = "audio/mp4"
        ;

      aws.s3(s3Bucket).getFile(s3Path, function(err, result){
        if(err) { return next(err); }
        res.setHeader("Content-disposition", "filename="+dbRow.guid+"."+audioFileExtension);
        res.setHeader("Content-type", audioContentType);
        result.pipe(res);           
      });
  },

  guardianAudio: function(req,res,dbAudio) {

    var views = getAllViews();

    if (!util.isArray(dbAudio)) { dbAudio = [dbAudio]; }
    var jsonArray = [];

    return new Promise(function(resolve,reject){

        for (dbAudInd in dbAudio) {

          token.createAnonymousToken({
            reference_tag: dbAudInd,
            token_type: "audio-file",
            minutes_until_expiration: 15,
            created_by: null,
            allow_garbage_collection: false,
            only_allow_access_to: [
              // the generated token will only be usable for the specific audio file url
              "/v1/audio/"+dbAudio[dbAudInd].guid+"."+dbAudio[dbAudInd].url.substr(1+dbAudio[dbAudInd].url.lastIndexOf("."))
              ]
          }).then(function(tokenInfo){
              try {

                var dbRow = dbAudio[tokenInfo.reference_tag],
                audioFileExtension = dbRow.url.substr(1+dbRow.url.lastIndexOf(".")),
                s3NoProtocol = dbRow.url.substr(dbRow.url.indexOf("://")+3),
                s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
                s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"))
                ;

                var audio = {
                  guid: dbRow.guid,
                  measured_at: dbRow.measured_at,
                  analyzed_at: dbRow.analyzed_at,
                  size: dbRow.size,
                  duration: dbRow.duration,
                  format: dbRow.capture_format,
                  bitrate: dbRow.capture_bitrate,
                  sample_rate: dbRow.capture_sample_rate,
                  sha1_checksum: dbRow.sha1_checksum,
                  url: req.rfcx.api_url+"/v1/audio/"+dbRow.guid+"."+audioFileExtension
                    +"?auth_expires_at="+tokenInfo.token_expires_at.toISOString()
                    +"&auth_user=token/"+tokenInfo.token_guid
                    +"&auth_token="+tokenInfo.token,
                  url_expires_at: tokenInfo.token_expires_at,
                  events: []
                };

                 if (dbRow.Guardian != null) { audio.guardian = views.models.guardian(req,res,dbRow.Guardian)[0]; }
                 if (dbRow.CheckIn != null) { audio.checkin = views.models.guardianCheckIns(req,res,dbRow.CheckIn); }
                 if (dbRow.Event != null) { audio.events = views.models.guardianEvents(req,res,dbRow.Event); }

                jsonArray.push(audio);

                if (jsonArray.length == dbAudio.length) {
                  resolve(jsonArray);
                }
                
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

