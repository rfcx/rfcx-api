exports.models = {

  guardianMetaPower: function (req, res, dbPower, modelInfo) {
    if (!Array.isArray(dbPower)) { dbPower = [dbPower] }

    const jsonArray = []

    for (const i in dbPower) {
      const dbRow = dbPower[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        is_powered: dbRow.is_powered,
        is_charged: dbRow.is_charged
      })
    }
    return jsonArray
  }

}
