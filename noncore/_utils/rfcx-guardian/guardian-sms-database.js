const models = require('../../_models')

exports.messages = {

  info: function (jsonMessages, guardianId, checkInId) {
    const messageInfo = {}
    if (Array.isArray(jsonMessages)) {
      for (const msgInd in jsonMessages) {
        messageInfo[jsonMessages[msgInd].android_id] = {
          android_id: jsonMessages[msgInd].android_id,
          guid: null,
          guardian_id: guardianId,
          checkin_id: checkInId,
          version: null,
          address: jsonMessages[msgInd].address,
          body: jsonMessages[msgInd].body,
          timeStamp: (jsonMessages[msgInd].received_at != null) ? new Date(parseInt(jsonMessages[msgInd].received_at)) : null,
          received_at: (jsonMessages[msgInd].received_at != null) ? new Date(parseInt(jsonMessages[msgInd].received_at)) : null,
          sent_at: (jsonMessages[msgInd].sent_at != null) ? new Date(parseInt(jsonMessages[msgInd].sent_at)) : null,
          isSaved: false
        }
      }
    }
    return messageInfo
  },

  save: function (messageInfo) {
    return models.GuardianMetaMessage.create({
      guardian_id: messageInfo.guardian_id,
      check_in_id: messageInfo.checkin_id,
      received_at: messageInfo.received_at,
      sent_at: messageInfo.sent_at,
      address: messageInfo.address,
      body: messageInfo.body,
      android_id: messageInfo.android_id
    })
      .then((dbGuardianMetaMessage) => {
        messageInfo.isSaved = true
        messageInfo.guid = dbGuardianMetaMessage.guid
        return messageInfo
      })
  },

  send: function () {

  }

}
