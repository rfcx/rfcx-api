const hash = require('../../utils/misc/hash')
const checkInHelpers = require('../../utils/rfcx-checkin')
const pingRouter = require('../../utils/rfcx-guardian/router-ping.js').pingRouter
const guidService = require('../../utils/misc/guid.js')
const smsTwilio = require('../../utils/rfcx-guardian/guardian-sms-twilio.js').smsTwilio

exports.guardianMsgParsingUtils = {

  constructGuardianMsgObj: function (inputJsonObj, guardianId, guardianToken) {
    const msgObj = {

      // input msg json
      json: inputJsonObj,

      // db objects
      db: {},

      // general msg meta
      meta: {
        guardian: {},
        allow_without_auth_token: false,
        startTime: new Date()
      },

      // asset meta
      audio: {},
      screenshots: {},
      logs: {},
      photos: {},
      videos: {},

      // return cmd obj
      rtrn: {
        obj: {
          checkin_id: null,
          // asset types
          audio: [],
          meta: [],
          screenshots: [],
          logs: [],
          photos: [],
          videos: [],
          messages: [],
          apks: [],
          detections: [],
          classifiers: [],
          instructions: [],
          prefs: [],
          segments: [],
          snippets: [],
          // asset exchange status
          purged: [],
          received: [],
          unconfirmed: []
        }
      },

      // alternative (shorter) field names
      abbr: {
        fields: {
          // asset types
          audio: 'aud',
          meta: 'mta',
          screenshots: 'scn',
          logs: 'log',
          photos: 'pho',
          videos: 'vid',
          messages: 'sms',
          apks: 'apk',
          detections: 'det',
          classifiers: 'cls',
          instructions: 'ins',
          prefs: 'prf',
          segments: 'seg',
          snippets: 'sni',
          // asset exchange status
          purged: 'prg',
          received: 'rec',
          unconfirmed: 'unc'
        }
      }
    }

    if (!msgObj.json.guardian) { msgObj.json.guardian = {} }
    if (guardianId) { msgObj.json.guardian.guid = guardianId }
    if (guardianToken) { msgObj.json.guardian.token = guardianToken }

    return msgObj
  },

  msgSegmentConstants: function () {
    const obj = {
      lengths: {
        maxFullSeg: { sms: 160, sbd: 100, swm: 192 },
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
    const groupGuidLength = this.msgSegmentConstants().lengths.grpGuid
    let str = ''
    const key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < groupGuidLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }
    return str
  },

  generateSegmentId: function (idNum) {
    const segmentIdLength = this.msgSegmentConstants().lengths.segId
    let zeroes = ''
    for (let i = 0; i < segmentIdLength; i++) { zeroes += '0' }
    return (zeroes + idNum.toString(16)).slice(0 - segmentIdLength)
  },

  constructSegmentsGroupForQueue: function (guardianGuid, guardianPinCode, msgType, apiProtocol, msgJsonObj, msgJsonGzippedBuffer) {
    let msgGzipStr = msgJsonGzippedBuffer.toString('base64')
    const groupGuid = this.generateSegmentGroupGuid()
    const msgSegLengths = this.msgSegmentConstants().lengths
    const fullMsgChecksumSnippet = hash.hashData(JSON.stringify(msgJsonObj)).substr(0, msgSegLengths.chkSumSnip)
    const segments = []

    let segIdDec = 0
    let segHeader = ''
    const segHeaderZero = groupGuid + this.generateSegmentId(segIdDec) + guardianGuid + guardianPinCode + msgType + fullMsgChecksumSnippet
    let segBodyLength = 0
    const segBodyLengthZero = msgSegLengths.maxFullSeg[apiProtocol] - segHeaderZero.length - msgSegLengths.segId

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
    const sliceAt = this.msgSegmentConstants().sliceAt

    const segObj = {
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
    let concatSegs = ''
    const sortedSegments = dbSegs.sort((a, b) => a.segment_id - b.segment_id)
    for (let i = 0; i < sortedSegments.length; i++) { concatSegs += sortedSegments[i].body }

    checkInHelpers.gzip.unZipJson(encodeURIComponent(concatSegs)).bind({})
      .then(function (jsonObj) {
        if (dbSegGrp.type === 'png') {
          if (hash.hashData(JSON.stringify(jsonObj)).substr(0, dbSegGrp.checksum_snippet.length) === dbSegGrp.checksum_snippet) {
            let messageId = guidService.generate()

            const pingObj = getPingObj(jsonObj, guardianGuid, null)
            pingObj.meta.allow_without_auth_token = true

            pingRouter.onMessagePing(pingObj, messageId)
              .then((result) => {
                if (JSON.stringify(result.obj).length > 2) {
                  const segsForQueue = constructSegmentsGroup(guardianGuid, guardianPinCode, 'cmd', dbSegGrp.protocol, result.obj, result.gzip)

                  for (let i = 0; i < segsForQueue.length; i++) {
                    smsTwilio.sendSms(segsForQueue[i], dbSegs[0].origin_address)
                  }
                }
                for (let k = 0; k < dbSegs.length; k++) { dbSegs[k].destroy() }
                dbSegGrp.destroy()

                console.log('sms ping message processed', messageId)
                messageId = null
                result = null

                return true
              })
          }
        }
      })
  },

  decodeSegmentsToJSON: function (segments) {
    let concatSegs = ''
    const sortedSegments = segments.sort((a, b) => a.segment_id - b.segment_id)
    for (let i = 0; i < sortedSegments.length; i++) { concatSegs += sortedSegments[i].body }

    return checkInHelpers.gzip.unZipJson(encodeURIComponent(concatSegs)).bind({})
      .then(function (jsonObj) {
        return jsonObj
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
  const sliceAt = (hasFiniteLength) ? [sliceAtVals[keyName][0], sliceAtVals[keyName][1]] : [(sliceAtVals[keyName][0] + sliceAtVals[keyName][1])]
  const segPayloadStr = segPayload.toString()
  if (segProtocol === 'sms') {
    // return sliced string
    return (sliceAt.length > 1) ? segPayloadStr.substr(sliceAt[0], sliceAt[1]) : segPayloadStr.substr(sliceAt[0])
  } else if (segProtocol === 'sbd') {
    // return sliced byte buffer
    return (sliceAt.length > 1) ? segPayloadStr.substr(sliceAt[0], sliceAt[1]) : segPayloadStr.substr(sliceAt[0])
  } else if (segProtocol === 'swm') {
    // return sliced string
    return (sliceAt.length > 1) ? segPayloadStr.substr(sliceAt[0], sliceAt[1]) : segPayloadStr.substr(sliceAt[0])
  }
  return null
}
