exports.models = {

  audioAnalysisMethods: function (req, res, dbAnalysisMethods) {
    if (!Array.isArray(dbAnalysisMethods)) { dbAnalysisMethods = [dbAnalysisMethods] }

    var jsonArray = []

    for (const i in dbAnalysisMethods) {
      var dbRow = dbAnalysisMethods[i]

      var jsonRow = {
        name: dbRow.name,
        download_url: dbRow.download_url,
        start_command: dbRow.start_command
      }

      jsonArray.push(jsonRow)
    }
    return jsonArray
  }

}
