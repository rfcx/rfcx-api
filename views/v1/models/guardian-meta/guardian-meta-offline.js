var util = require("util");

exports.models = {

  guardianMetaOffline: function(req,res,dbOffline) {

    if (!util.isArray(dbOffline)) { dbOffline = [dbOffline]; }

    var jsonArray = [];

    for (i in dbOffline) {

      var dbRow = dbOffline[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        offline_duration: dbRow.offline_duration,
        carrier_name: dbRow.carrier_name
      });
    }
    return jsonArray;
  
  }

};

