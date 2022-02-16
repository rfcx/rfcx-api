exports.models = {

  guardianMetaMessages: function (req, res, dbMessages, modelInfo) {
    if (!Array.isArray(dbMessages)) { dbMessages = [dbMessages] }

    const jsonArray = []

    for (const i in dbMessages) {
      const dbRow = dbMessages[i]

      jsonArray.push({
        guid: dbRow.guid,
        received_at: dbRow.received_at,
        sent_at: dbRow.sent_at,
        address: dbRow.address,
        body: dbRow.body
      })
    }
    return jsonArray
  }

}
