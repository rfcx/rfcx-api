exports.models = {

  guardianMetaDataTransfer: function (req, res, dbDataTransfer, modelInfo) {
    if (!Array.isArray(dbDataTransfer)) { dbDataTransfer = [dbDataTransfer] }

    var jsonArray = []

    for (const i in dbDataTransfer) {
      var dbRow = dbDataTransfer[i]

      jsonArray.push({
        started_at: dbRow.started_at,
        ended_at: dbRow.ended_at,
        bytes_received: dbRow.bytes_received,
        bytes_sent: dbRow.bytes_sent,
        total_bytes_received: dbRow.total_bytes_received,
        total_bytes_sent: dbRow.total_bytes_sent
      })
    }
    return jsonArray
  }

}
