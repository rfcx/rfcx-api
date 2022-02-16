exports.models = {

  guardianMetaNetwork: function (req, res, dbNetwork, modelInfo) {
    if (!Array.isArray(dbNetwork)) { dbNetwork = [dbNetwork] }

    const jsonArray = []

    for (const i in dbNetwork) {
      const dbRow = dbNetwork[i]

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
