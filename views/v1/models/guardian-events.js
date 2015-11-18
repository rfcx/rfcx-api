var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var token = require("../../../utils/auth-token.js").token;
function getAllViews() { return require("../../../views/v1"); }

exports.models = {

  guardianEvents: function(req,res,dbEvents) {

    var views = getAllViews();

    if (!util.isArray(dbEvents)) { dbEvents = [dbEvents]; }
    
    var jsonArray = [];
    var eventRowOutput = {};
    var eventDbRow = {};

    return new Promise(function(resolve,reject){

        for (dbEventInd in dbEvents) {

          var dbRow = dbEvents[dbEventInd];

          eventDbRow[dbRow.guid] = dbEvents[dbEventInd];

          eventRowOutput[dbRow.guid] = {
            guid: dbRow.guid,
            classification: dbRow.classification,
            measured_at: dbRow.measured_at,
            duration: dbRow.duration,
            location: {
              latitude: parseFloat(dbRow.latitude),
              longitude: parseFloat(dbRow.longitude)
            },
            fingerprint: null
          };
          
          if (dbRow.fingerprint != null) { eventRowOutput[dbRow.guid].fingerprint = JSON.parse(dbRow.fingerprint); }

          if (dbRow.Audio == null) {
            
            eventRowOutput[dbRow.guid].audio = null;
            jsonArray.push(eventRowOutput[dbRow.guid]);   

            if (jsonArray.length == dbEvents.length) {
              resolve(jsonArray);
            }

          } else {

            token.createAnonymousToken({
              reference_tag: dbRow.guid,
              token_type: "event-audio-file",
              minutes_until_expiration: 60,
              created_by: null,
              allow_garbage_collection: false,
              only_allow_access_to: [
                // the generated token will only be usable for the specific audio file url
                "^/v1/audio/"+dbRow.Audio.guid+"."+dbRow.Audio.url.substr(1+dbRow.Audio.url.lastIndexOf("."))+"$"
                ]
            }).then(function(tokenInfo){
                try {

                  var dbRow = eventDbRow[tokenInfo.reference_tag];

                  audioFileExtension = dbRow.Audio.url.substr(1+dbRow.Audio.url.lastIndexOf(".")),
                  s3NoProtocol = dbRow.Audio.url.substr(dbRow.Audio.url.indexOf("://")+3),
                  s3Bucket = s3NoProtocol.substr(0,s3NoProtocol.indexOf("/")),
                  s3Path = s3NoProtocol.substr(s3NoProtocol.indexOf("/"))
                  ;

                  eventRowOutput[tokenInfo.reference_tag].url = 
                      req.rfcx.api_url+"/v1/audio/"+dbRow.Audio.guid+"."+audioFileExtension
                      +"?auth_user=token/"+tokenInfo.token_guid
                      +"&auth_token="+tokenInfo.token
                      +"&auth_expires_at="+tokenInfo.token_expires_at.toISOString();

                  eventRowOutput[tokenInfo.reference_tag].url_expires_at = tokenInfo.token_expires_at,

                  // var audio = {
                  //   guid: eventDbRow.Audio.guid,
                  //   measured_at: eventDbRow.Audio.measured_at,
                  //   analyzed_at: dbRow.analyzed_at,
                  //   size: dbRow.size,
                  //   duration: dbRow.duration,
                  //   format: dbRow.capture_format,
                  //   bitrate: dbRow.capture_bitrate,
                  //   sample_rate: dbRow.capture_sample_rate,
                  //   sha1_checksum: dbRow.sha1_checksum,
                  //   url: req.rfcx.api_url+"/v1/audio/"+dbRow.guid+"."+audioFileExtension
                  //     +"?auth_user=token/"+tokenInfo.token_guid
                  //     +"&auth_token="+tokenInfo.token
                  //     +"&auth_expires_at="+tokenInfo.token_expires_at.toISOString(),
                  //   url_expires_at: tokenInfo.token_expires_at,
                  //   events: []
                  // };

                  //  if (dbRow.Guardian != null) { audio.guardian = views.models.guardian(req,res,dbRow.Guardian)[0]; }
                  //  if (dbRow.CheckIn != null) { audio.checkin = views.models.guardianCheckIns(req,res,dbRow.CheckIn); }
                  //  if (dbRow.Event != null) { audio.events = views.models.guardianEvents(req,res,dbRow.Event); }

                  jsonArray.push(eventRowOutput[tokenInfo.reference_tag]);

                  if (jsonArray.length == dbEvents.length) {
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
        }

    });




  }


};

