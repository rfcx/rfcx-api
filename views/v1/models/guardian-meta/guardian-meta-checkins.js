exports.models = {

  guardianMetaCheckIns: function (req, res, dbCheckIns, modelInfo) {
    if (!Array.isArray(dbCheckIns)) { dbCheckIns = [dbCheckIns] }

    var jsonArray = []

    for (const i in dbCheckIns) {
      var dbRow = dbCheckIns[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        queued_for: (dbRow.measured_at.valueOf() - dbRow.queued_at.valueOf()),
        latency: dbRow.request_latency_guardian,
        queued: dbRow.guardian_queued_checkins
      })
    }
    return jsonArray
  }

}
