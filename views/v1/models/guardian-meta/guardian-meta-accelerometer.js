exports.models = {

  guardianMetaAccelerometer: function (req, res, dbAccelerometer, modelInfo) {
    if (!Array.isArray(dbAccelerometer)) { dbAccelerometer = [dbAccelerometer] }

    const jsonArray = []

    for (const i in dbAccelerometer) {
      const dbRow = dbAccelerometer[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        x: dbRow.x,
        y: dbRow.y,
        z: dbRow.z
      })
    }
    return jsonArray
  }

}
