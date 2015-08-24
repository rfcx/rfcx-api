var util = require("util");

exports.models = {

  guardianMetaLightMeter: function(req,res,dbLightMeter) {

    if (!util.isArray(dbLightMeter)) { dbLightMeter = [dbLightMeter]; }

    var jsonArray = [];

    for (i in dbLightMeter) {

      var dbRow = dbLightMeter[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        luminosity: dbRow.luminosity
      });
    }
    return jsonArray;
  
  }

};

