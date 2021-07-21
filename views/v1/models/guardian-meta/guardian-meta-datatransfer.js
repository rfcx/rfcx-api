exports.models = {

  guardianMetaDataTransfer: function (req, res, dbDataTransfer, modelInfo) {
    if (!Array.isArray(dbDataTransfer)) { dbDataTransfer = [dbDataTransfer] }

    const jsonArray = []

    for (const i in dbDataTransfer) {
      const dbRow = dbDataTransfer[i]

      jsonArray.push({
        started_at: dbRow.started_at,
        ended_at: dbRow.ended_at,
        
        mobile_bytes_received: dbRow.mobile_bytes_received,
        mobile_bytes_sent: dbRow.mobile_bytes_sent,
        mobile_total_bytes_received: dbRow.mobile_total_bytes_received,
        mobile_total_bytes_sent: dbRow.mobile_total_bytes_sent,

        network_bytes_received: dbRow.network_bytes_received,
        network_bytes_sent: dbRow.network_bytes_sent,
        network_total_bytes_received: dbRow.network_total_bytes_received,
        network_total_bytes_sent: dbRow.network_total_bytes_sent,

        bytes_received: dbRow.bytes_received,
        bytes_sent: dbRow.bytes_sent,
        total_bytes_received: dbRow.total_bytes_received,
        total_bytes_sent: dbRow.total_bytes_sent
      })
    }
    return jsonArray
  }

}
