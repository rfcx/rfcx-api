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
        msgTypeLength = 3,
        msgChecksumLength = 40;
    
    // var segMaxLength = 160;

    var segObj = {
      group_guid: segBody.substr(0, grpGuidLength),
      segment_id: parseInt(segBody.substr(grpGuidLength, segIdLength), 16),
      protocol: segProtocol,
      origin_address: originAddress,
      message_type: null,
      message_checksum: null,
      segment_count: 0,
      guardian_guid: null,
      segment_body: null
    };

    if (segObj.segment_id == 0) {
      segObj.guardian_guid = segBody.substr(grpGuidLength+segIdLength, guardianGuidLength);
      segObj.message_type = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength, msgTypeLength);
      segObj.message_checksum = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+msgTypeLength, msgChecksumLength);
      segObj.segment_count = parseInt(segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+msgTypeLength+msgChecksumLength, segIdLength), 16);
      segObj.segment_body = segBody.substr(grpGuidLength+segIdLength+guardianGuidLength+msgTypeLength+msgChecksumLength+segIdLength);
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
          
          if (hash.hashData(JSON.stringify(jsonObj)) == dbSegGrp.checksum) {
            
            let messageId = guidService.generate()
            var pingObj = getPingObj(jsonObj, guardianGuid, "gays3c1g04su7z39aevqiomzblh06h896t99hu8a");
            pingRouter.onMessagePing(pingObj, messageId)
              .then((result) => {    
                console.log('sms message processed', messageId)
                messageId = null
                result = null
                return true
              })
            for (var i = 0; i < dbSegs.length; i++) { dbSegs[i].destroy(); }
            dbSegGrp.destroy();
          }

        }
      })
  }

}


function getPingObj(inputJsonObj, guardianId, guardianToken) {
  return exports.guardianMsgParsingUtils.constructGuardianMsgObj(inputJsonObj, guardianId, guardianToken);
}