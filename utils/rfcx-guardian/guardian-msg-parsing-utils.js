// var Promise = require('bluebird')
// var zlib = require('zlib')
var hash = require('../../utils/misc/hash.js').hash;
var checkInHelpers = require('../../utils/rfcx-checkin')
var pingRouter = require('../../utils/rfcx-guardian/router-ping.js').pingRouter
const guidService = require('../../utils/misc/guid.js')

exports.guardianMsgParsingUtils = {

  constructGuardianMsgObj: function (inputJsonObj, guardianId, guardianToken) {
    
    var msgObj = { 

      // input msg json
      json: inputJsonObj,
      
      // db objects
      db: { }, 

      // general msg meta
      meta: { 
        guardian: { },
        allow_without_auth_token: false,
        startTime: new Date()
      }, 

      // asset meta
      audio: { }, 
      screenshots: { }, 
      logs: { }, 
      photos: { }, 
      videos: { },
      
      // return cmd obj
      rtrn: {
        obj: {
          checkin_id: null,
          audio: [],
          screenshots: [],
          logs: [],
          messages: [],
          meta: [],
          photos: [],
          videos: [],
          purged: [],
          received: [],
          unconfirmed: [],
          prefs: [],
          instructions: [],
          segment: []
        }
      }
    };

    if (msgObj.json.guardian == null) { msgObj.json.guardian = {}; }
    if (guardianId != null) { msgObj.json.guardian.guid = guardianId; }
    if (guardianToken != null) { msgObj.json.guardian.token = guardianToken; }

    return msgObj;

  },


  buildMsgSegmentObj: function (segBody, segProtocol, originAddress) {
    
    var grpGuidLength = 4,
        segIdLength = 3,
        guardianGuidLength = 12,
        guardianPinCodeLength = 4,
        msgTypeLength = 3,
        msgChecksumSnippetLength = 20;
    
    // var segMaxLength = 160;

    var segObj = {
      group_guid: segBody.substr(0, grpGuidLength),
      segment_id: parseInt(segBody.substr(grpGuidLength, segIdLength), 16),
      protocol: segProtocol,
      origin_address: originAddress,
      message_type: null,
      message_checksum_snippet: null,
      segment_count: 0,
      guardian_guid: null,
      guardian_pincode: null,
      segment_body: null
    };

    if (segObj.segment_id == 0) {
      segObj.guardian_guid = segBody.substr(grpGuidLength+segIdLength, guardianGuidLength);
      segObj.guardian_pincode = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength, guardianGuidLength);
      segObj.message_type = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+guardianPinCodeLength, msgTypeLength);
      segObj.message_checksum_snippet = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+guardianPinCodeLength+msgTypeLength, msgChecksumSnippetLength);
      segObj.segment_count = parseInt(segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+guardianPinCodeLength+msgTypeLength+msgChecksumSnippetLength, segIdLength), 16);
      segObj.segment_body = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+guardianPinCodeLength+msgTypeLength+msgChecksumSnippetLength+segIdLength);
    } else {
      segObj.segment_body = segBody.substr(grpGuidLength+segIdLength);
    }

    return segObj;  
  },

  assembleReceivedSegments: function (dbSegs, dbSegGrp, guardianGuid) {

    var concatSegs = "";
    for (var i = 0; i < dbSegs.length; i++) { concatSegs += dbSegs[i].body; }

    checkInHelpers.gzip.unZipJson(encodeURIComponent(concatSegs)).bind({})
      .then(function (jsonObj){

        if (dbSegGrp.type == "png") {
          
          if (hash.hashData(JSON.stringify(jsonObj)).substr(0,dbSegGrp.checksum_snippet.length) == dbSegGrp.checksum_snippet) {
            
            let messageId = guidService.generate()
            
            var pingObj = getPingObj(jsonObj, guardianGuid, null);
            pingObj.meta.allow_without_auth_token = true;

            pingRouter.onMessagePing(pingObj, messageId)
              .then((result) => {   

                for (var i = 0; i < dbSegs.length; i++) { dbSegs[i].destroy(); }
                dbSegGrp.destroy();
 
                console.log('sms message processed', messageId)
                messageId = null
                result = null

                return true
              })

          }

        }
      })
  }

}


function getPingObj(inputJsonObj, guardianId, guardianToken) {
  return exports.guardianMsgParsingUtils.constructGuardianMsgObj(inputJsonObj, guardianId, guardianToken);
}