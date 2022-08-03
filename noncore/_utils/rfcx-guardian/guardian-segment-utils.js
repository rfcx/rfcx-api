const { EmptyResultError } = require('../../../common/error-handling/errors')
const models = require('../../_models')
const msgSegUtils = require('./guardian-msg-parsing-utils').guardianMsgParsingUtils

exports.segmentUtils = {
  saveSegmentToDb: async function (segObj) {
    await models.GuardianMetaSegmentsReceived
      .findOrCreate({
        where: {
          group_guid: segObj.group_guid,
          segment_id: segObj.segment_id,
          protocol: segObj.protocol,
          origin_address: `${segObj.origin_address}`,
          body: segObj.segment_body
        },
        defaults: {
          received_at: new Date()
        }
      }).spread(async (dbSegmentRec, created) => {
        if (!created) {
          dbSegmentRec.body = segObj.segment_body
          return await dbSegmentRec.save()
        }
        return dbSegmentRec
      })

    if ((segObj.segment_id === 0) && (segObj.guardian_guid != null)) {
      const dbGuardian = await models.Guardian
        .findOne({
          where: { guid: segObj.guardian_guid }
        })
      if (dbGuardian === null) {
        throw new EmptyResultError('Guardian not found')
      }

      if (segObj.guardian_pincode === dbGuardian.auth_pin_code) {
        const guardianMetaSegGrp = await models.GuardianMetaSegmentsGroup
          .findOrCreate({
            where: {
              guid: segObj.group_guid,
              protocol: segObj.protocol,
              segment_count: segObj.segment_count,
              type: segObj.message_type,
              checksum_snippet: segObj.message_checksum_snippet,
              guardian_id: dbGuardian.id
            }
          }).spread((dbSegmentRec) => {
            return dbSegmentRec
          })

        if (guardianMetaSegGrp) {
          const dbSegments = await models.GuardianMetaSegmentsReceived.findAll({
            where: { group_guid: guardianMetaSegGrp.guid }
          })
          if (guardianMetaSegGrp.segment_count === dbSegments.length) {
            // this appears to only execute sometimes. Less reliably when the number of segments is high.
            // probably a race condition?
            msgSegUtils.assembleReceivedSegments(dbSegments, guardianMetaSegGrp, segObj.guardian_guid, segObj.guardian_pincode)
          }
        }
      } else {
        console.info("Failed to match PIN Code '" + segObj.guardian_pincode + "'")
      }
    } else {
      const dbSegmentGrp = await models.GuardianMetaSegmentsGroup
        .findOne({
          where: { guid: segObj.group_guid },
          include: [{ model: models.Guardian, as: 'Guardian' }]
        })
      if (dbSegmentGrp) {
        const dbSegments = await models.GuardianMetaSegmentsReceived.findAll({
          where: { group_guid: dbSegmentGrp.guid }
        })
        if (dbSegmentGrp.segment_count === dbSegments.length) {
          // this appears to only execute sometimes. Less reliably when the number of segments is high.
          // probably a race condition?
          msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, dbSegmentGrp.Guardian.guid, dbSegmentGrp.Guardian.auth_pin_code)
        }
      }
    }
  },

  getSegmentsFromGroupId: async function (groupId) {
    return await models.GuardianMetaSegmentsReceived.findAll({
      where: { group_guid: groupId }
    })
  }
}
