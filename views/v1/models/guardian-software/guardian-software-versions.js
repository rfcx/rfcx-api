exports.models = {

  guardianSoftwareVersions: function (req, res, dbSoftwareVersion) {
    if (!Array.isArray(dbSoftwareVersion)) { dbSoftwareVersion = [dbSoftwareVersion] }

    var jsonArray = []

    // TODO: do we still need this function?
    return jsonArray
  }

}
