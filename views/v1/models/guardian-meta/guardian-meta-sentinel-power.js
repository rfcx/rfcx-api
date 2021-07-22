exports.models = {

  guardianMetaSentinelPower: function (req, res, dbPower, modelInfo) {
    if (!Array.isArray(dbPower)) { dbPower = [dbPower] }

    const jsonArray = []

    for (const i in dbPower) {
      const dbRow = dbPower[i]
      jsonArray.push({
        measured_at: dbRow.measured_at,
        battery_state_of_charge: dbRow.battery_state_of_charge,
        battery_power: dbRow.battery_power,
        system_power: dbRow.system_power,
        check_in_id: dbRow.check_in_id
      })
    }
    return jsonArray
  }

}
