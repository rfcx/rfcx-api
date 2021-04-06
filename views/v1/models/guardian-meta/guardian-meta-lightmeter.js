exports.models = {

  guardianMetaLightMeter: function (req, res, dbLightMeter, modelInfo) {
    if (!Array.isArray(dbLightMeter)) { dbLightMeter = [dbLightMeter] }

    const jsonArray = []

    for (const i in dbLightMeter) {
      const dbRow = dbLightMeter[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        luminosity: dbRow.luminosity
      })
    }
    return jsonArray
  }

}
