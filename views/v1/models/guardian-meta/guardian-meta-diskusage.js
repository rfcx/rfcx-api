exports.models = {

  guardianMetaDiskUsage: function (req, res, dbDiskUsage, modelInfo) {
    if (!Array.isArray(dbDiskUsage)) { dbDiskUsage = [dbDiskUsage] }

    var jsonArray = []

    for (const i in dbDiskUsage) {
      var dbRow = dbDiskUsage[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        internal_bytes_available: dbRow.internal_bytes_available,
        internal_bytes_used: dbRow.internal_bytes_used,
        external_bytes_available: dbRow.external_bytes_available,
        external_bytes_used: dbRow.external_bytes_used
      })
    }
    return jsonArray
  }

}
