// var Promise = require('bluebird')
// var zlib = require('zlib')
var hash = require('../../utils/misc/hash.js').hash
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
    }

    if (!msgObj.json.guardian) { msgObj.json.guardian = {} }
    if (guardianId != null) { msgObj.json.guardian.guid = guardianId }
    if (guardianToken != null) { msgObj.json.guardian.token = guardianToken }

    return msgObj
  },

  msgSegmentConstants: function () {
    var obj = {
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

    obj.sliceAt = {
      group_guid: [0, obj.lengths.grpGuid],
      segment_id: [obj.lengths.grpGuid, obj.lengths.segId],
      guardian_guid: [(obj.lengths.grpGuid + obj.lengths.segId), obj.lengths.grdGuid],
      guardian_pincode: [(obj.lengths.grpGuid + obj.lengths.segId + obj.lengths.grdGuid), obj.lengths.pinCode],
      message_type: [(obj.lengths.grpGuid + obj.lengths.segId + obj.lengths.grdGuid + obj.lengths.pinCode), obj.lengths.msgType],
      message_checksum_snippet: [(obj.lengths.grpGuid + obj.lengths.segId + obj.lengths.grdGuid + obj.lengths.pinCode + obj.lengths.msgType), obj.lengths.chkSumSnip],
      segment_count: [(obj.lengths.grpGuid + obj.lengths.segId + obj.lengths.grdGuid + obj.lengths.pinCode + obj.lengths.msgType + obj.lengths.chkSumSnip), obj.lengths.segId]
    }

    return obj
  },

  generateSegmentGroupGuid: function () {
    var groupGuidLength = this.msgSegmentConstants().lengths.grpGuid
    var str = ''
    var key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (var i = 0; i < groupGuidLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }
    return str
  },

  generateSegmentId: function (idNum) {
    var segmentIdLength = this.msgSegmentConstants().lengths.segId
    var zeroes = ''
    for (var i = 0; i < segmentIdLength; i++) { zeroes += '0' }
    return (zeroes + idNum.toString(16)).slice(0 - segmentIdLength)
  },

  constructSegmentsGroupForQueue: function (guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer) {
    var msgGzipStr = msgJsonGzippedBuffer.toString('base64')
    var groupGuid = this.generateSegmentGroupGuid()
    var msgSegLengths = this.msgSegmentConstants().lengths
    var fullMsgChecksumSnippet = hash.hashData(JSON.stringify(msgJsonObj)).substr(0, msgSegLengths.chkSumSnip)
    var segments = []

    var segIdDec = 0
    var segHeader = ''
    var segHeaderZero = groupGuid + this.generateSegmentId(segIdDec) + guardianGuid + guardianPinCode + msgType + fullMsgChecksumSnippet
    var segBodyLength = 0
    var segBodyLengthZero = msgSegLengths.maxFullSeg[apiProtocol] - segHeaderZero.length - msgSegLengths.segId

    segments.push(msgGzipStr.substring(0, segBodyLengthZero))
    msgGzipStr = msgGzipStr.substring(segBodyLengthZero)

    while (msgGzipStr.length > 0) {
      segIdDec++
      segHeader = groupGuid + this.generateSegmentId(segIdDec)
      segBodyLength = msgSegLengths.maxFullSeg[apiProtocol] - segHeader.length
      segments.push(segHeader + msgGzipStr.substring(0, segBodyLength))
      msgGzipStr = msgGzipStr.substring(segBodyLength)
    }

    segments[0] = segHeaderZero + this.generateSegmentId(segments.length) + segments[0]

    // for (var i = 0; i < segments.length; i++) {
    //   console.log(" - "+segments[i]+" ("+segments[i].length+")")
    // }

    return segments
  },

  parseMsgSegment: function (segPayload, segProtocol, originAddress) {
    var sliceAt = this.msgSegmentConstants().sliceAt

    var segObj = {
      group_guid: slicePayload(segPayload, segProtocol, 'group_guid', sliceAt, true),
      segment_id: parseInt(slicePayload(segPayload, segProtocol, 'segment_id', sliceAt, true), 16),
      segment_body: slicePayload(segPayload, segProtocol, 'segment_id', sliceAt, false),
      protocol: segProtocol,
      origin_address: originAddress
    }

    if (segObj.segment_id === 0) {
      segObj.guardian_guid = slicePayload(segPayload, segProtocol, 'guardian_guid', sliceAt, true)
      segObj.guardian_pincode = slicePayload(segPayload, segProtocol, 'guardian_pincode', sliceAt, true)
      segObj.message_type = slicePayload(segPayload, segProtocol, 'message_type', sliceAt, true)
      segObj.message_checksum_snippet = slicePayload(segPayload, segProtocol, 'message_checksum_snippet', sliceAt, true)
      segObj.segment_count = parseInt(slicePayload(segPayload, segProtocol, 'segment_count', sliceAt, true), 16)
      segObj.segment_body = slicePayload(segPayload, segProtocol, 'segment_count', sliceAt, false)
    }

    return segObj
  },

  assembleReceivedSegments: function (dbSegs, dbSegGrp, guardianGuid, guardianPinCode) {
    var concatSegs = ''
    for (var i = 0; i < dbSegs.length; i++) { concatSegs += dbSegs[i].body }

    checkInHelpers.gzip.unZipJson(encodeURIComponent(concatSegs)).bind({})
      .then(function (jsonObj) {
        if (dbSegGrp.type === 'png') {
          if (hash.hashData(JSON.stringify(jsonObj)).substr(0, dbSegGrp.checksum_snippet.length) === dbSegGrp.checksum_snippet) {
            let messageId = guidService.generate()

            var pingObj = getPingObj(jsonObj, guardianGuid, null)
            pingObj.meta.allow_without_auth_token = true

            pingRouter.onMessagePing(pingObj, messageId)
              .then((result) => {
                if (JSON.stringify(result.obj).length > 2) {
                  var segsForQueue = constructSegmentsGroup(guardianGuid, guardianPinCode, 'cmd', dbSegGrp.protocol, result.obj, result.gzip)

                  for (var i = 0; i < segsForQueue.length; i++) {
                    smsTwilio.sendSms(segsForQueue[i], dbSegs[0].origin_address)
                  }
                }
                for (var k = 0; k < dbSegs.length; k++) { dbSegs[k].destroy() }
                dbSegGrp.destroy()

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

function getPingObj (inputJsonObj, guardianId, guardianToken) {
  return exports.guardianMsgParsingUtils.constructGuardianMsgObj(inputJsonObj, guardianId, guardianToken)
}

function constructSegmentsGroup (guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer) {
  return exports.guardianMsgParsingUtils.constructSegmentsGroupForQueue(guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer)
}

function slicePayload (segPayload, segProtocol, keyName, sliceAtVals, hasFiniteLength) {
  var sliceAt = (hasFiniteLength) ? [sliceAtVals[keyName][0], sliceAtVals[keyName][1]] : [(sliceAtVals[keyName][0] + sliceAtVals[keyName][1])]
  if (segProtocol === 'sms') {
    // return sliced string
    return (sliceAt.length > 1) ? segPayload.substr(sliceAt[0], sliceAt[1]) : segPayload.substr(sliceAt[0])
  } else if (segProtocol === 'sbd') {
    // return sliced byte buffer
    return (sliceAt.length > 1) ? segPayload.slice(sliceAt[0], sliceAt[1]) : segPayload.slice(sliceAt[0])
  }
  return null
}
