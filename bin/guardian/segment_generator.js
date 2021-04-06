#!/usr/bin/env node

// var ascii85 = require('ascii85').ZeroMQ

const hash = require('../../utils/misc/hash')
const zlib = require('zlib')

const groupLength = 4
const segmentIdLength = 3
const msgChecksumSnippetLength = 20
const segmentMaxLength = 160

function generateGroupId () {
  let str = ''
  const key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < groupLength; i++) { str += key.charAt(Math.floor(Math.random() * key.length)) }
  return str
}

function generateSegmentId (idNum) {
  let zeroes = ''
  for (let i = 0; i < segmentIdLength; i++) { zeroes += '0' }
  return (zeroes + idNum.toString(16)).slice(0 - segmentIdLength)
}

function createSegments (guardianGuid, guardianPinCode, fullOriginalMsg) {
  zlib.gzip(Buffer.from(fullOriginalMsg, 'utf8'), function (errJsonGzip, bufJsonGzip) {
    if (errJsonGzip) { console.log(errJsonGzip) } else {
      let fullEncodedMsg = bufJsonGzip.toString('base64')
      // ascii85.encode(bufJsonGzip).toString('ascii')
      // .replace(/\^/g,",")
      // .replace(/\[/g,"_").replace(/\]/g,"¿")
      // .replace(/\{/g,"é").replace(/\}/g,"è")

      //     console.log("Base85 - Length: "+fullEncodedMsg.length+" Checksum: "+hash.hashData(fullEncodedMsg)+"\n\n");

      const grpId = generateGroupId()
      const segments = []

      let segIdDec = 0
      let segHeader = ''; const segHeaderZero = grpId + generateSegmentId(segIdDec) + guardianGuid + guardianPinCode + 'cmd' + hash.hashData(fullOriginalMsg).substr(0, msgChecksumSnippetLength)
      let segBodyLength = 0; const segBodyLengthZero = segmentMaxLength - segHeaderZero.length - segmentIdLength
      segments.push(fullEncodedMsg.substring(0, segBodyLengthZero))
      fullEncodedMsg = fullEncodedMsg.substring(segBodyLengthZero)

      while (fullEncodedMsg.length > 0) {
        segIdDec++
        segHeader = grpId + generateSegmentId(segIdDec)
        segBodyLength = segmentMaxLength - segHeader.length
        segments.push(segHeader + fullEncodedMsg.substring(0, segBodyLength))
        fullEncodedMsg = fullEncodedMsg.substring(segBodyLength)
      }

      segments[0] = segHeaderZero + generateSegmentId(segments.length) + segments[0]

      for (let i = 0; i < segments.length; i++) {
        console.log(' - ' + segments[i] + ' (' + segments[i].length + ')')
      }
    }
  })
}

const guardianGuid = '298c2kwyfg55'
const guardianPinCode = 'i9ch'

// var jsonMsgStr = "{\"segment\":[{\"id\":\"2LzH-000\"},{\"id\":\"2LzH-001\"},{\"id\":\"2LzH-002\"},{\"id\":\"2LzH-003\"},{\"id\":\"2LzH-004\"},{\"id\":\"2LzH-005\"}]}";
const jsonMsgStr = '{"segment":["oxsI-000","oxsI-001","oxsI-002","oxsI-003","oxsI-004","oxsI-005","oxsI-006","oxsI-007","oxsI-008","oxsI-009","oxsI-00a","oxsI-00b","oxsI-00c","oxsI-00d"]}'

// var jsonMsgStr = "{\"checkin_id\":\"0e380746-7a0b-4f37-814d-c93dde3c283b\",\"audio\":[{\"id\":\"1608367468981\"}],\"meta\":[{\"id\":\"1608367559144\"},{\"id\":\"1608367358777\"}],\"purged\":[{\"type\":\"audio\",\"id\":\"1608367268514\"},{\"type\":\"audio\",\"id\":\"1608367358860\"}],\"instructions\":[{\"id\":247,\"type\":\"set\",\"cmd\":\"prefs\",\"meta\":\"{'admin_enable_geoposition_capture':'false'}\",\"at\":\"\"}]}";

createSegments(guardianGuid, guardianPinCode, jsonMsgStr)
