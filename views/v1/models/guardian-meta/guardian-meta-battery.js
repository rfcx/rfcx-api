var util = require("util");

exports.models = {

  guardianMetaBattery: function(req,res,dbBattery) {

    if (!util.isArray(dbBattery)) { dbBattery = [dbBattery]; }

    var jsonArray = [];

    for (i in dbBattery) {

      var dbRow = dbBattery[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_charged: dbRow.battery_percent,
        temperature: dbRow.battery_temperature
      });
    }
    return jsonArray;
  
  }

};

