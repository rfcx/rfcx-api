exports.models = {

  guardianMetaOffline: function (req, res, dbOffline, modelInfo) {
    if (!Array.isArray(dbOffline)) { dbOffline = [dbOffline] }

    const jsonArray = []

    for (const i in dbOffline) {
      const dbRow = dbOffline[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        offline_duration: dbRow.offline_duration,
        carrier_name: dbRow.carrier_name
      })
    }
    return jsonArray
  }

}
