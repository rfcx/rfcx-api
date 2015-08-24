var util = require("util");

exports.models = {

  guardianSoftwareVersions: function(req,res,dbSoftwareVersion) {

    if (!util.isArray(dbSoftwareVersion)) { dbSoftwareVersion = [dbSoftwareVersion]; }

    var jsonArray = [];

    for (i in dbSoftwareVersion) {

      var dbRow = dbSoftwareVersion[i];

      jsonArray.push({
        // measured_at: dbRow.measured_at,
        // offline_duration: dbRow.offline_duration,
        // carrier_name: dbRow.carrier_name
      });
    }
    return jsonArray;
  
  }

};

