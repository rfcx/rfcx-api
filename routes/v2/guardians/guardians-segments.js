const models = require('../../../models')
const express = require('express')
const router = express.Router()
const httpError = require('../../../utils/http-errors.js')
const sequelize = require('sequelize')

const msgSegUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils
const smsTwilio = require('../../../utils/rfcx-guardian/guardian-sms-twilio.js').smsTwilio
const sbdRockBlock = require('../../../utils/rfcx-guardian/guardian-sbd-rockblock.js').sbdRockBlock

router.route('/segments/sms')
  .post(function (req, res) {
    if (smsTwilio.validateIncomingMessage(req)) {
      console.log('Incoming Twilio message validated...')

      const segObj = msgSegUtils.parseMsgSegment(req.body.Body, 'sms', req.body.From)

      models.GuardianMetaSegmentsReceived
        .findOrCreate({
          where: {
            group_guid: segObj.group_guid,
            segment_id: segObj.segment_id,
            protocol: segObj.protocol,
            origin_address: segObj.origin_address
          },
          defaults: {
            received_at: new Date()
          }
        })
        .spread((dbSegmentRec, created) => {
          dbSegmentRec.body = segObj.segment_body

          return dbSegmentRec.save()
            .bind({})
            .then((dbSegmentRec) => {
              this.dbSegmentRec = dbSegmentRec

              if ((segObj.segment_id === 0) && (segObj.guardian_guid != null)) {
                return models.Guardian
                  .findOne({
                    where: { guid: segObj.guardian_guid }
                  }).then(function (dbGuardian) {
                    this.dbGuardian = dbGuardian

                    if (segObj.guardian_pincode === dbGuardian.auth_pin_code) {
                      return models.GuardianMetaSegmentsGroup
                        .findOrCreate({
                          where: {
                            guid: segObj.group_guid,
                            protocol: segObj.protocol,
                            segment_count: segObj.segment_count,
                            type: segObj.message_type,
                            checksum_snippet: segObj.message_checksum_snippet,
                            guardian_id: dbGuardian.id
                          }
                        })
                        .spread((dbSegmentGrp, created) => {
                          this.dbSegmentGrp = dbSegmentGrp
                          if (dbSegmentGrp) {
                            return models.GuardianMetaSegmentsReceived.findAll({
                              where: { group_guid: dbSegmentGrp.guid },
                              order: [['segment_id', 'ASC']]
                            }).then(function (dbSegments) {
                              if (dbSegmentGrp.segment_count === dbSegments.length) {
                                msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, segObj.guardian_guid, segObj.guardian_pincode)
                              }
                            })
                          }
                        })
                    } else {
                      console.log("Failed to match PIN Code '" + segObj.guardian_pincode + "'")
                    }
                  })
              } else {
                return models.GuardianMetaSegmentsGroup
                  .findOne({
                    where: { guid: segObj.group_guid },
                    include: [{ model: models.Guardian, as: 'Guardian' }]
                  }).then(function (dbSegmentGrp) {
                    this.dbSegmentGrp = dbSegmentGrp
                    if (dbSegmentGrp) {
                      return models.GuardianMetaSegmentsReceived.findAll({
                        where: { group_guid: dbSegmentGrp.guid },
                        order: [['segment_id', 'ASC']]
                      }).then(function (dbSegments) {
                        if (dbSegmentGrp.segment_count === dbSegments.length) {
                          msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, dbSegmentGrp.Guardian.guid, dbSegmentGrp.Guardian.auth_pin_code)
                        }
                      })
                    }
                  })
              }
            })

            .then(() => {
              res.writeHead(200, { 'Content-Type': 'text/xml' })
              res.end()
            })
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

<<<<<<< HEAD
      var segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'hex'), 'sbd', req.body.imei)
      
      models.GuardianMetaSegmentsReceived
        .findOrCreate({
          where: {
            group_guid: segObj.group_guid,
            segment_id: segObj.segment_id,
            protocol: segObj.protocol,
            origin_address: segObj.origin_address
          },
          defaults: {
            received_at: new Date()
          }
        })
        .spread((dbSegmentRec, created) => {
          dbSegmentRec.body = segObj.segment_body

          return dbSegmentRec.save()
            .bind({})
            .then((dbSegmentRec) => {
              this.dbSegmentRec = dbSegmentRec

              if ((segObj.segment_id === 0) && (segObj.guardian_guid != null)) {
                return models.Guardian
                  .findOne({
                    where: { guid: segObj.guardian_guid }
                  }).then(function (dbGuardian) {
                    this.dbGuardian = dbGuardian

                    if (segObj.guardian_pincode === dbGuardian.auth_pin_code) {
                      return models.GuardianMetaSegmentsGroup
                        .findOrCreate({
                          where: {
                            guid: segObj.group_guid,
                            protocol: segObj.protocol,
                            segment_count: segObj.segment_count,
                            type: segObj.message_type,
                            checksum_snippet: segObj.message_checksum_snippet,
                            guardian_id: dbGuardian.id
                          }
                        })
                        .spread((dbSegmentGrp, created) => {
                          this.dbSegmentGrp = dbSegmentGrp
                          if (dbSegmentGrp) {
                            return models.GuardianMetaSegmentsReceived.findAll({
                              where: { group_guid: dbSegmentGrp.guid },
                              order: [['segment_id', 'ASC']]
                            }).then(function (dbSegments) {
                              if (dbSegmentGrp.segment_count === dbSegments.length) {
                                msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, segObj.guardian_guid, segObj.guardian_pincode)
                              }
                            })
                          }
                        })
                    } else {
                      console.log("Failed to match PIN Code '" + segObj.guardian_pincode + "'")
                    }
                  })
              } else {
                return models.GuardianMetaSegmentsGroup
                  .findOne({
                    where: { guid: segObj.group_guid },
                    include: [{ model: models.Guardian, as: 'Guardian' }]
                  }).then(function (dbSegmentGrp) {
                    this.dbSegmentGrp = dbSegmentGrp
                    if (dbSegmentGrp) {
                      return models.GuardianMetaSegmentsReceived.findAll({
                        where: { group_guid: dbSegmentGrp.guid },
                        order: [['segment_id', 'ASC']]
                      }).then(function (dbSegments) {
                        if (dbSegmentGrp.segment_count === dbSegments.length) {
                          msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, dbSegmentGrp.Guardian.guid, dbSegmentGrp.Guardian.auth_pin_code)
                        }
                      })
                    }
                  })
              }
            })

            .then(() => {
              res.writeHead(200, { 'Content-Type': 'text/xml' })
              res.end()
            })
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
=======
      //      console.log(req.body)

      const segObj = msgSegUtils.parseMsgSegment(Buffer.from(req.body.data, 'hex'), 'sbd', req.body.imei)
>>>>>>> feature/parse-guardian-detections


    } else {
      res.writeHead(401, { 'Content-Type': 'text/xml' })
      res.end()
    }
  })

module.exports = router
