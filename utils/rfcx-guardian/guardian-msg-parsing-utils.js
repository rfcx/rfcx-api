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
        maxFullSeg: { sms: 160, sbd: 340 },
        grpGuid: 4,
        segId: 3,
        grdGuid: 12,
        pinCode: 4,
        msgType: 3,
        chkSumSnip: 20
      }
    }
  },


  generateGroupGuid: function() {
    var groupGuidLength = this.msgSegmentConstants().lengths.grpGuid,
        str = '',
        key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < groupGuidLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }
    return str
  },


  generateSegmentId: function(idNum) {
    var segmentIdLength = this.msgSegmentConstants().lengths.segId,
        zeroes = "";
    for (var i = 0; i < segmentIdLength; i++) { zeroes += "0"; }
    return (zeroes + idNum.toString(16)).slice(0-segmentIdLength);
  },


  constructSegmentsGroupForQueue: function(guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer) {

    var msgGzipStr = msgJsonGzippedBuffer.toString('base64'),
        groupGuid = this.generateGroupGuid(),
        msgSegLengths = this.msgSegmentConstants().lengths,
        fullMsgChecksumSnippet = hash.hashData(JSON.stringify(msgJsonObj)).substr(0,msgSegLengths.chkSumSnip),
        segments = [];

    var segIdDec = 0,
        segHeader = "", 
        segHeaderZero = groupGuid + this.generateSegmentId(segIdDec) + guardianGuid + guardianPinCode + msgType + fullMsgChecksumSnippet,
        segBodyLength = 0, 
        segBodyLengthZero = msgSegLengths.maxFullSeg[apiProtocol] - segHeaderZero.length - msgSegLengths.segId;

    segments.push(msgGzipStr.substring(0, segBodyLengthZero));
    msgGzipStr = msgGzipStr.substring(segBodyLengthZero);

    while (msgGzipStr.length > 0) {
      segIdDec++;
      segHeader = groupGuid + this.generateSegmentId(segIdDec);
      segBodyLength = msgSegLengths.maxFullSeg[apiProtocol] - segHeader.length;
      segments.push(segHeader + msgGzipStr.substring(0, segBodyLength));
      msgGzipStr = msgGzipStr.substring(segBodyLength);
    }

    segments[0] = segHeaderZero + this.generateSegmentId(segments.length) + segments[0];

    // for (var i = 0; i < segments.length; i++) {
    //   console.log(" - "+segments[i]+" ("+segments[i].length+")")
    // }

    return segments;
  },


  parseMsgSegment: function (segBody, segProtocol, originAddress) {
    
    var msgSegLengths = this.msgSegmentConstants().lengths;

    var segObj = {
      group_guid: segBody.substr(0, msgSegLengths.grpGuid),
      segment_id: parseInt(segBody.substr(msgSegLengths.grpGuid, msgSegLengths.segId), 16),
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
      segObj.guardian_guid = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId, msgSegLengths.grdGuid);
      segObj.guardian_pincode = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId+msgSegLengths.grdGuid, msgSegLengths.pinCode);
      segObj.message_type = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId+msgSegLengths.grdGuid+msgSegLengths.pinCode, msgSegLengths.msgType);
      segObj.message_checksum_snippet = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId+msgSegLengths.grdGuid+msgSegLengths.pinCode+msgSegLengths.msgType, msgSegLengths.chkSumSnip);
      segObj.segment_count = parseInt(segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId+msgSegLengths.grdGuid+msgSegLengths.pinCode+msgSegLengths.msgType+msgSegLengths.chkSumSnip, msgSegLengths.segId), 16);
      segObj.segment_body = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId+msgSegLengths.grdGuid+msgSegLengths.pinCode+msgSegLengths.msgType+msgSegLengths.chkSumSnip+msgSegLengths.segId);
    } else {
      segObj.segment_body = segBody.substr(msgSegLengths.grpGuid+msgSegLengths.segId);
    }

    return segObj;  
  },

  assembleReceivedSegments: function (dbSegs, dbSegGrp, guardianGuid, guardianPinCode) {

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

                if (JSON.stringify(result.obj).length > 2) {
                  var segsForQueue = constructSegmentsGroup(guardianGuid, guardianPinCode, "cmd", dbSegGrp.protocol, result.obj, result.gzip);
                  for (var i = 0; i < segsForQueue.length; i++) { 
                    smsTwilio.sendSms(segsForQueue[i], dbSegs[0].origin_address);
                  }
                }

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

function constructSegmentsGroup(guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer) {
  return exports.guardianMsgParsingUtils.constructSegmentsGroupForQueue(guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer);
}