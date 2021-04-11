exports.models = {

  guardianSoftwareVersions: function (req, res, dbSoftwareVersion) {
    if (!Array.isArray(dbSoftwareVersion)) { dbSoftwareVersion = [dbSoftwareVersion] }

    const jsonArray = []

    // TODO: do we still need this function?
    return jsonArray
  }

}
