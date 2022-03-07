exports.models = {

  guardianMetaMemory: function (req, res, dbMeta, modelInfo) {
    if (!Array.isArray(dbMeta)) { dbMeta = [dbMeta] }

    const jsonArray = []

    for (const i in dbMeta) {
      const dbRow = dbMeta[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        system_bytes_available: dbRow.system_bytes_available,
        system_bytes_used: dbRow.system_bytes_used,
        system_bytes_minimum: dbRow.system_bytes_minimum
      })
    }
    return jsonArray
  }

}
