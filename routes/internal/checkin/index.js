const router = require('express').Router()
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const pingRouter = require('../../../utils/rfcx-guardian/router-ping.js').pingRouter
const guardianMsgParsingUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils').guardianMsgParsingUtils
const { deleteSegmentsAndGroup } = require('../../../utils/rfcx-guardian/guardian-segment-utils').segmentUtils
const smsTwilio = require('../../../utils/rfcx-guardian/guardian-sms-twilio.js').smsTwilio
const { hasRole } = require('../../../middleware/authorization/authorization')

router.post('/assembled', hasRole(['systemUser']), function (req, res) {
  const data = req.body
  pingRouter.onMessagePing(data)
    .then(async (result) => {
      if (JSON.stringify(result.obj).length > 2) {
        const { guardian_guid, guardian_pin_code, group_protocol, origin_address } = data.misc // eslint-disable-line camelcase
        const segsForQueue = guardianMsgParsingUtils.constructSegmentsGroupForQueue(guardian_guid, guardian_pin_code, 'cmd', group_protocol, result.obj, result.gzip)
        if (data.misc.group_protocol === 'sms') {
          for (let i = 0; i < segsForQueue.length; i++) {
            smsTwilio.sendSms(segsForQueue[i], origin_address)
          }
        }
      }
      await deleteSegmentsAndGroup(data.misc.ids.segments, data.misc.ids.group)
    })
    .catch(httpErrorHandler(req, res, 'Unable to process assembled checkin.'))
})

module.exports = router
