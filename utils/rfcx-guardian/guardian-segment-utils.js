const models = require('../../models')

exports.segmentUtils = {
  saveSegmentToDb: async function (segObj) {
    console.log('1')
    const guardianMetaSegRecv = await models.GuardianMetaSegmentsReceived
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

      console.log('2')
    const [dbSegmentRec, created] = await guardianMetaSegRecv.all()
    dbSegmentRec.body = segObj.segment_body

    console.log('3')
    await dbSegmentRec.save()

    if ((segObj.segment_id === 0) && (segObj.guardian_guid != null)) {
      console.log('4')
      const dbGuardian = await models.Guardian
        .findOne({
          where: { guid: segObj.guardian_guid }
        })
      this.dbGuardian = dbGuardian

      if (segObj.guardian_pincode === dbGuardian.auth_pin_code) {
        console.log('5')
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
          })

          console.log('6')
        const [dbSegmentGrp, created] = guardianMetaSegGrp.all()
        this.dbSegmentGrp = dbSegmentGrp
        if (dbSegmentGrp) {
          console.log('7')
          const dbSegments = await models.GuardianMetaSegmentsReceived.findAll({
            where: { group_guid: dbSegmentGrp.guid },
            order: [['segment_id', 'ASC']]
          })
          if (dbSegmentGrp.segment_count === dbSegments.length) {
            // this appears to only execute sometimes. Less reliably when the number of segments is high.
            // probably a race condition?
            console.log('8')
            msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, segObj.guardian_guid, segObj.guardian_pincode)
          }
        }
      } else {
        console.log("Failed to match PIN Code '" + segObj.guardian_pincode + "'")
      }
    } else {
      console.log('9')
      const dbSegmentGrp = await models.GuardianMetaSegmentsGroup
        .findOne({
          where: { guid: segObj.group_guid },
          include: [{ model: models.Guardian, as: 'Guardian' }]
        })
      this.dbSegmentGrp = dbSegmentGrp
      if (dbSegmentGrp) {
        console.log('10')
        const dbSegments = await models.GuardianMetaSegmentsReceived.findAll({
          where: { group_guid: dbSegmentGrp.guid },
          order: [['segment_id', 'ASC']]
        })
        if (dbSegmentGrp.segment_count === dbSegments.length) {
          // this appears to only execute sometimes. Less reliably when the number of segments is high.
          // probably a race condition?
          console.log('11')
          msgSegUtils.assembleReceivedSegments(dbSegments, dbSegmentGrp, dbSegmentGrp.Guardian.guid, dbSegmentGrp.Guardian.auth_pin_code)
        }
      }
    }
  }
}
