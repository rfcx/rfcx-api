exports.models = {

  guardianMetaNetwork: function (req, res, dbNetwork, modelInfo) {
    if (!Array.isArray(dbNetwork)) { dbNetwork = [dbNetwork] }

    var jsonArray = []

    for (const i in dbNetwork) {
      var dbRow = dbNetwork[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        signal_strength: dbRow.signal_strength,
        network_type: dbRow.network_type,
        carrier_name: dbRow.carrier_name
      })
    }
    return jsonArray
  }

}
