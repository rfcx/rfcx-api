exports.models = {

  guardianMetaBattery: function (req, res, dbBattery, modelInfo) {
    if (!Array.isArray(dbBattery)) { dbBattery = [dbBattery] }

    var jsonArray = []

    for (const i in dbBattery) {
      var dbRow = dbBattery[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_charged: dbRow.battery_percent,
        temperature: dbRow.battery_temperature
      })
    }
    return jsonArray
  }

}
