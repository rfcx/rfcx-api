exports.models = {

  guardianMetaBattery: function (req, res, dbBattery, modelInfo) {
    if (!Array.isArray(dbBattery)) { dbBattery = [dbBattery] }

    const jsonArray = []

    for (const i in dbBattery) {
      const dbRow = dbBattery[i]
      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_charged: dbRow.battery_percent,
        check_in_id: dbRow.check_in_id
      })
    }
    return jsonArray
  }

}
