exports.models = {

  guardianMetaSentinelAccelerometer: function (req, res, dbAccelerometer, modelInfo) {
    if (!Array.isArray(dbAccelerometer)) { dbAccelerometer = [dbAccelerometer] }

    const jsonArray = []

    for (const i in dbAccelerometer) {
      const dbRow = dbAccelerometer[i]

      jsonArray.push({
        measured_at: dbRow.measured_at,
        x: dbRow.x_milli_g_force_accel,
        y: dbRow.y_milli_g_force_accel,
        z: dbRow.z_milli_g_force_accel
      })
    }
    return jsonArray
  }

}
