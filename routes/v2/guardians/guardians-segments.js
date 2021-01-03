var models = require('../../../models')
var express = require('express')
var router = express.Router()
var httpError = require('../../../utils/http-errors.js')
var sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')

var msgSegUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils
// var checkInHelpers = require('../../../utils/rfcx-checkin')
// var pingRouter = require('../../../utils/rfcx-guardian/router-ping.js').pingRouter
// const guidService = require('../../../utils/misc/guid.js')

router.route('/segments/twilio')
  .post(function (req, res) {

    var msgSid = req.body.MessageSid,
        svcSid = req.body.MessagingServiceSid,
        acctSid = req.body.AccountSid,
        smsTo = req.body.To;

    var segObj = msgSegUtils.buildMsgSegmentObj(req.body.Body, "sms", req.body.From);

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
            
          dbSegmentRec.body = segObj.segment_body;

          return dbSegmentRec.save()
            .bind({})
            .then((dbSegmentRec) => {
              this.dbSegmentRec = dbSegmentRec

              if ((segObj.segment_id == 0) && (segObj.guardian_guid != null)) {
                
                return models.Guardian
                  .findOne({
                    where: { guid: segObj.guardian_guid }
                    }).then(function (dbGuardian) {
                      this.dbGuardian = dbGuardian

                      return models.GuardianMetaSegmentsGroup
                        .findOrCreate({
                          where: {
                            guid: segObj.group_guid,
                            protocol: segObj.protocol,
                            segment_count: segObj.segment_count,
                            type: segObj.message_type,
                            checksum: segObj.message_checksum,
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
                                if (dbSegmentGrp.segment_count == dbSegments.length) {
                                 
                                  msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, segObj.guardian_guid);
                                
                                }
                              })
                            }
                        });
                    })
              
              } else {

                return models.GuardianMetaSegmentsGroup
                  .findOne({
                    where: { guid: segObj.group_guid }, 
                    include: [{ model: models.Guardian, as: "Guardian" }]
                    }).then(function (dbSegmentGrp) {
                      this.dbSegmentGrp = dbSegmentGrp
                      if (dbSegmentGrp) {
                        return models.GuardianMetaSegmentsReceived.findAll({
                            where: { group_guid: dbSegmentGrp.guid },
                            order: [['segment_id', 'ASC']]
                          }).then(function (dbSegments) {
                            if (dbSegmentGrp.segment_count == dbSegments.length) {
                              
                              msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, dbSegmentGrp.Guardian.guid);
                            
                            }
                          })
                        }

                    })
              }

            })

            // .then((dbGuardian) => {
            //   if (req.rfcx.auth_token_info && req.rfcx.auth_token_info.userType === 'auth0') {
            //     return userService.getUserByGuid(req.rfcx.auth_token_info.guid)
            //       .then((user) => {
            //         dbGuardian.creator = user.id
            //         dbGuardian.is_private = true
            //         return dbGuardian.save()
            //       })
            //   } else {
            //     return this.dbGuardian
            //   };
            // })

            // .then((dbGuardian) => {
            //   const visibility = dbGuardian.is_private ? 'private' : 'public'
            //   return models.StreamVisibility
            //     .findOrCreate({
            //       where: { value: visibility },
            //       defaults: { value: visibility }
            //     })
            //     .spread((dbVisibility) => {
            //       const opts = {
            //         guid: dbGuardian.guid,
            //         name: dbGuardian.shortname,
            //         site: dbGuardian.site_id,
            //         created_by: dbGuardian.creator,
            //         visibility: dbVisibility.id
            //       }
            //       if (dbGuardian.creator) {
            //         opts.created_by = dbGuardian.creator
            //       }
            //       return models.Stream
            //         .create(opts)
            //     })
            // })

            
            .then(() => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end();
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
        });

  })

module.exports = router
