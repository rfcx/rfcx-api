exports.models = {

  guardianMetaReboots: function (req, res, dbReboots, modelInfo) {
    if (!Array.isArray(dbReboots)) { dbReboots = [dbReboots] }

    const jsonArray = []

    for (const i in dbReboots) {
      const dbRow = dbReboots[i]

      jsonArray.push({
        completed_at: dbRow.completed_at
      })
    }
    return jsonArray
  }

}
