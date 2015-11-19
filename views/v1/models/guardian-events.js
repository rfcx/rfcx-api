var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var token = require("../../../utils/auth-token.js").token;
function getAllViews() { return require("../../../views/v1"); }

exports.models = {

  guardianEvents: function(req,res,dbRows,PARENT_GUID) {

    var views = getAllViews();

    if (!util.isArray(dbRows)) { dbRows = [dbRows]; }
    
    var jsonArray = [], jsonRowsByGuid = {}, dbRowsByGuid = {};

    return new Promise(function(resolve,reject){

        for (i in dbRows) {

          var thisRow = dbRows[i], thisGuid = thisRow.guid;

          dbRowsByGuid[thisGuid] = thisRow;

          jsonRowsByGuid[thisGuid] = {
            guid: thisGuid,
            analyzed_at: thisRow.Audio.analyzed_at,
            reviewed_at: null,
            classification: {
              analysis: thisRow.classification,
              review: null
            },
            measured_at: {
              analysis: thisRow.measured_at,
              review: null
            },
            duration: {
              analysys: thisRow.duration,
              review: null
            },
            location: {
              latitude: parseFloat(thisRow.latitude),
              longitude: parseFloat(thisRow.longitude)
            }
          };

          if (thisRow.Site != null) { jsonRowsByGuid[thisGuid].site_id = thisRow.Site.guid; }
          if (thisRow.Guardian != null) { jsonRowsByGuid[thisGuid].guardian_id = thisRow.Guardian.guid; }
          if (thisRow.CheckIn != null) { jsonRowsByGuid[thisGuid].checkin_id = thisRow.CheckIn.guid; }

          if (PARENT_GUID != null) { jsonRowsByGuid[thisGuid].PARENT_GUID = PARENT_GUID; }

          token.createAnonymousToken({
            reference_tag: thisGuid,
            token_type: "event-audio-file",
            minutes_until_expiration: 60,
            created_by: null,
            allow_garbage_collection: false,
            only_allow_access_to: [ "^/v1/events/"+thisGuid+".mp3$" ]
          }).then(function(tokenInfo){
              try {

                var thisRow = dbRowsByGuid[tokenInfo.reference_tag], thisGuid = thisRow.guid;

                jsonRowsByGuid[thisGuid].url = 
                    req.rfcx.api_url+"/v1/events/"+thisGuid+".mp3"
                    +"?auth_user=token/"+tokenInfo.token_guid
                    +"&auth_token="+tokenInfo.token
                    +"&auth_expires_at="+tokenInfo.token_expires_at.toISOString();

                jsonRowsByGuid[thisGuid].url_expires_at = tokenInfo.token_expires_at;

                if (thisRow.Audio == null) {

                  jsonArray.push(jsonRowsByGuid[thisGuid]);
                  if (jsonArray.length == dbRows.length) { resolve(jsonArray); }

                } else {
                  views.models.guardianAudio(req,res,thisRow.Audio,thisGuid)
                    .then(function(audioJson){

                      thisGuid = audioJson[0].PARENT_GUID;
                      delete audioJson[0].PARENT_GUID;
                      jsonRowsByGuid[thisGuid].audio = audioJson[0];

                      jsonArray.push(jsonRowsByGuid[thisGuid]);
                      if (jsonArray.length == dbRows.length) { resolve(jsonArray); }

                    });
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


  }

};

