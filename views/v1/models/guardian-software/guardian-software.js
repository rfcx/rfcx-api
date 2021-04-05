exports.models = {

  guardianSoftware: function (req, res, dbSoftware) {
    if (!Array.isArray(dbSoftware)) { dbSoftware = [dbSoftware] }

    const jsonArray = []

    for (const i in dbSoftware) {
      const dbRow = dbSoftware[i]

      if (dbRow.CurrentVersion != null) {
        jsonArray.push({
          role: dbRow.role,
          version: dbRow.CurrentVersion.version,
          released: dbRow.CurrentVersion.release_date.toISOString(),
          sha1: dbRow.CurrentVersion.sha1_checksum,
          size: dbRow.CurrentVersion.size,
          url: dbRow.CurrentVersion.url
        })
      }
    }
    return jsonArray
  }

}
