const express = require('express')
const router = express.Router()
const httpError = require('../../../utils/http-errors.js')
const sequelize = require('sequelize')
const passport = require('passport')

const msgSegUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils
const smsTwilio = require('../../../utils/rfcx-guardian/guardian-sms-twilio.js').smsTwilio
const sbdRockBlock = require('../../../utils/rfcx-guardian/guardian-sbd-rockblock.js').sbdRockBlock
const swarmMsg = require('../../../utils/rfcx-guardian/guardian-swm.js').swarm

const segmentUtils = require('../../../utils/rfcx-guardian/guardian-segment-utils.js').segmentUtils

router.route('/segments/sms')
  .post(function (req, res) {
    if (smsTwilio.validateIncomingMessage(req)) {
      console.log('Incoming Twilio message validated...')

      const segObj = msgSegUtils.parseMsgSegment(req.body.Body, 'sms', req.body.From)

      segmentUtils.saveSegmentToDb(segObj)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end()
        })
        .catch(sequelize.ValidationError, e => {
          let message = 'Validation error'
          try {
            message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
          } catch (err) { }
          httpError(req, res, 400, null, message)
        })
        .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
        .catch(function (err) {
          console.log(err)
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
      console.log('Incoming RockBlock message validated...')

      const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'hex'), 'sbd', req.body.imei)

      segmentUtils.saveSegmentToDb(segObj)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end()
        })
        .catch(sequelize.ValidationError, e => {
          let message = 'Validation error'
          try {
            message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
          } catch (err) { }
          httpError(req, res, 400, null, message)
        })
        .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
        .catch(function (err) {
          console.log(err)
          res.status(500).json({ message: err.message, error: { status: 500 } })
        })
    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

router.route('/segments/swm')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    // To bypass test message for saving change on Swarm
    if (req.body.deviceId === 0 && req.body.packetId === 0) {
      res.writeHead(200, { 'Content-Type': 'text/xml' }).end()
    }

    if (swarmMsg.validateIncomingMessage(req)) {
      console.log('Incoming Swarm message validated...')

      const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'base64'), 'swm', req.body.deviceId)
      segmentUtils.saveSegmentToDb(segObj)
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end()
        })
        .catch(sequelize.ValidationError, e => {
          let message = 'Validation error'
          try {
            message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
          } catch (err) { }
          httpError(req, res, 400, null, message)
        })
        .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
        .catch(function (err) {
          console.log(err)
          res.status(500).json({ message: err.message, error: { status: 500 } })
        })
    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

// For debugging purposes
router.route('/segments/:groupId')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const groupId = req.params.groupId
    segmentUtils.getSegmentsFromGroupId(groupId)
      .then(segments => {
        if (segments.length === 0) {
          httpError(req, res, 400, null, 'group id is not existing')
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
