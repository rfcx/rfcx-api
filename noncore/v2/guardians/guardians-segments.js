const express = require('express')
const router = express.Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const passport = require('passport')

const msgSegUtils = require('../../_utils/rfcx-guardian/guardian-msg-parsing-utils').guardianMsgParsingUtils
const smsTwilio = require('../../_utils/rfcx-guardian/guardian-sms-twilio').smsTwilio
const sbdRockBlock = require('../../_utils/rfcx-guardian/guardian-sbd-rockblock').sbdRockBlock
const swarmMsg = require('../../_utils/rfcx-guardian/guardian-swm').swarm

const segmentUtils = require('../../_utils/rfcx-guardian/guardian-segment-utils').segmentUtils

router.route('/segments/sms')
  .post(function (req, res) {
    if (smsTwilio.validateIncomingMessage(req)) {
      console.info('Incoming Twilio message validated...')

      const segObj = msgSegUtils.parseMsgSegment(req.body.Body, 'sms', req.body.From)

      segmentUtils.saveSegmentToDb(segObj)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end()
        })
        .catch(httpErrorHandler(req, res, 'Failed processing segment'))
    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

router.route('/segments/sbd')
  .post(function (req, res) {
    if (sbdRockBlock.validateIncomingMessage(req)) {
      console.info('Incoming RockBlock message validated...')

      const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'hex'), 'sbd', req.body.imei)

      segmentUtils.saveSegmentToDb(segObj)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end()
        })
        .catch(httpErrorHandler(req, res, 'Failed processing segment'))
    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

router.route('/segments/swm')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    const deviceId = req.body.deviceId
    const packetId = req.body.packetId

    console.info(`swarm segment: ${deviceId} ${packetId} ${JSON.stringify(req.body)}`)

    // Swarm test message
    if (deviceId === 0 && packetId === 0) {
      console.info('swarm segment: test detected')
      res.sendStatus(200)
      return
    }

    if (!swarmMsg.validateIncomingMessage(req)) {
      console.error(`swarm segment: ${deviceId} ${packetId} invalid message: ${deviceId} ${packetId}`)
      res.sendStatus(400)
      return
    }

    console.info(`swarm segment: ${deviceId} ${packetId} validated`)

    const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'base64'), 'swm', deviceId)
    segmentUtils.saveSegmentToDb(segObj)
      .then(() => {
        console.info(`swarm segment: ${deviceId} ${packetId} processed`)
        res.sendStatus(200)
      })
      .catch(err => {
        console.error(`swarm segment: ${deviceId} ${packetId} failed ${JSON.stringify(err)}`)
        res.sendStatus(200)
      })
  })

module.exports = router
