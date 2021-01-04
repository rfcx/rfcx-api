// var Promise = require('bluebird')
// var zlib = require('zlib')
var hash = require('../../utils/misc/hash.js').hash;
var checkInHelpers = require('../../utils/rfcx-checkin')
var pingRouter = require('../../utils/rfcx-guardian/router-ping.js').pingRouter
const guidService = require('../../utils/misc/guid.js')
var smsTwilio = require('../../utils/rfcx-guardian/guardian-sms-twilio.js').smsTwilio

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

  msgSegmentConstants: function() {
    return {
      lengths: {
        grpGuid: 4,
        segId: 3,
        grdGuid: 12,
        pinCode: 4,
        msgType: 3,
        chkSumSnip: 20
      }
    }
  },

  parseMsgSegment: function (segBody, segProtocol, originAddress) {
    
    var msgSegNums = this.msgSegmentConstants().lengths;
    // var segMaxLength = 160;

    var segObj = {
      group_guid: segBody.substr(0, msgSegNums.grpGuid),
      segment_id: parseInt(segBody.substr(msgSegNums.grpGuid, msgSegNums.segId), 16),
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
      segObj.guardian_guid = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId, msgSegNums.grdGuid);
      segObj.guardian_pincode = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId+msgSegNums.grdGuid, msgSegNums.pinCode);
      segObj.message_type = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId+msgSegNums.grdGuid+msgSegNums.pinCode, msgSegNums.msgType);
      segObj.message_checksum_snippet = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId+msgSegNums.grdGuid+msgSegNums.pinCode+msgSegNums.msgType, msgSegNums.chkSumSnip);
      segObj.segment_count = parseInt(segBody.substr(msgSegNums.grpGuid+msgSegNums.segId+msgSegNums.grdGuid+msgSegNums.pinCode+msgSegNums.msgType+msgSegNums.chkSumSnip, msgSegNums.segId), 16);
      segObj.segment_body = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId+msgSegNums.grdGuid+msgSegNums.pinCode+msgSegNums.msgType+msgSegNums.chkSumSnip+msgSegNums.segId);
    } else {
      segObj.segment_body = segBody.substr(msgSegNums.grpGuid+msgSegNums.segId);
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

                smsTwilio.sendSms("This is a test, hello", dbSegs[0].origin_address)

                for (var i = 0; i < dbSegs.length; i++) { dbSegs[i].destroy(); }
                dbSegGrp.destroy();
 
                console.log('sms ping message processed', messageId)
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