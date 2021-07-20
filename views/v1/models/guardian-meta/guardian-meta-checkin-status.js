exports.models = {

  guardianMetaCheckInStatus: function (req, res, dbCheckIns, modelInfo) {
    if (!Array.isArray(dbCheckIns)) { dbCheckIns = [dbCheckIns] }

    const jsonArray = []

    for (const i in dbCheckIns) {
      const dbRow = dbCheckIns[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        queued_size_bytes: dbRow.queued_size_bytes,
        meta_size_bytes: dbRow.meta_size_bytes,
        stashed_size_bytes: dbRow.stashed_size_bytes,
        archived_size_bytes: dbRow.archived_size_bytes
      })
    }
    return jsonArray
  }

}
