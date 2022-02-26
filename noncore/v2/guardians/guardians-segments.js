const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../common/error-handling/http')
const { ValidationError } = require('sequelize')
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
        .catch(ValidationError, e => {
          let message = 'Validation error'
          try {
            message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
          } catch (err) { }
          httpErrorResponse(req, res, 400, null, message)
        })
        .catch(function (err) {
          console.error(err)
          res.status(500).json({ message: err.message, error: { status: 500 } })
        })
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
        .catch(ValidationError, e => {
          let message = 'Validation error'
          try {
            message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
          } catch (err) { }
          httpErrorResponse(req, res, 400, null, message)
        })
        .catch(function (err) {
          console.error(err)
          res.status(500).json({ message: err.message, error: { status: 500 } })
        })
    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

router.route('/segments/swm')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    console.info(`swarm segment: ${JSON.stringify(req.body)}`)

    const deviceId = req.body.deviceId
    const packetId = req.body.packetId

    // Swarm test message
    if (deviceId === 0 && packetId === 0) {
      console.info('swarm segment: test detected')
      res.writeHead(200, { 'Content-Type': 'text/xml' }).end()
      return
    }

    if (!swarmMsg.validateIncomingMessage(req)) {
      console.error(`swarm segment: invalid message: ${deviceId} ${packetId}`)
    }

    console.info(`swarm segment: validated ${deviceId} ${packetId}`)

    const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'base64'), 'swm', deviceId)
    segmentUtils.saveSegmentToDb(segObj)
      .then(() => {
        res.writeHead(200, { 'Content-Type': 'text/xml' }).end()
      })
      .catch(ValidationError, e => {
        let message = 'Validation error'
        try {
          message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
        } catch (_err) { }
        console.error(`swarm segment: validation: ${message}`)
        res.writeHead(400, { 'Content-Type': 'text/xml' }).send(`<ValidationError>${message}</ValidationError>`)
      })
      .catch(err => {
        console.error(`swarm segment: ${JSON.stringify(err)}`)
        res.writeHead(500, { 'Content-Type': 'text/xml' }).send(`<Error>${err.message}</Error>`)
      })
  })

// For debugging purposes
router.route('/segments/:groupId')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const groupId = req.params.groupId
    segmentUtils.getSegmentsFromGroupId(groupId)
      .then(segments => {
        if (segments.length === 0) {
          httpErrorResponse(req, res, 400, null, 'group id is not existing')
        }
        msgSegUtils.decodeSegmentsToJSON(segments)
          .then(result => {
            res.json(result)
          })
          .catch(err => {
            res.status(500).json({ message: err.message, error: { status: 500 } })
          })
      })
  })

module.exports = router
