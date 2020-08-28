exports.models = {

  guardianMetaCPU: function (req, res, dbMeta, modelInfo) {
    if (!Array.isArray(dbMeta)) { dbMeta = [dbMeta] }

    var jsonArray = []

    for (const i in dbMeta) {
      var dbRow = dbMeta[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_usage: dbRow.cpu_percent,
        clock_speed: dbRow.cpu_clock
      })
    }
    return jsonArray
  }

}
