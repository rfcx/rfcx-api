var util = require("util");

exports.models = {

  guardianMetaNetwork: function(req,res,dbNetwork) {

    if (!util.isArray(dbNetwork)) { dbNetwork = [dbNetwork]; }

    var jsonArray = [];

    for (i in dbNetwork) {

      var dbRow = dbNetwork[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        signal_strength: dbRow.signal_strength,
        carrier_name: dbRow.carrier_name
      });
    }
    return jsonArray;
  
  }

};

