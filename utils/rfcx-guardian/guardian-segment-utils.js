const models = require('../../models')

exports.segmentUtils = {
  saveSegmentToDb: async function (segObj) {
    await models.GuardianMetaSegmentsReceived
      .findOrCreate({
        where: {
          group_guid: segObj.group_guid,
          segment_id: segObj.segment_id,
          protocol: segObj.protocol,
          origin_address: segObj.origin_address,
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
      const dbGuardian = await models.Guardian.findOne({ where: { guid: segObj.guardian_guid } })

      if (segObj.guardian_pincode !== dbGuardian.auth_pin_code) {
        console.error(`Failed to match PIN Code "${segObj.guardian_pincode}"`)
      } else {
        await models.GuardianMetaSegmentsGroup
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
      }
    }
  },

  deleteSegmentsAndGroup: (segmentIds, groupId) => {
    return models.sequelize.transaction()
      .then(async (transaction) => {
        await models.GuardianMetaSegmentsReceived.destroy({
          where: { id: { [models.Sequelize.Op.in]: segmentIds } },
          transaction
        })
        await models.GuardianMetaSegmentsGroup.destroy({
          where: { id: groupId },
          transaction
        })
      })
  }
}
