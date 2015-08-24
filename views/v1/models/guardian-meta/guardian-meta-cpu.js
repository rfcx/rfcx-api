var util = require("util");

exports.models = {

  guardianMetaCPU: function(req,res,dbCPU) {

    if (!util.isArray(dbCPU)) { dbCPU = [dbCPU]; }

    var jsonArray = [];

    for (i in dbCPU) {

      var dbRow = dbCPU[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_usage: dbRow.cpu_percent,
        clock_speed: dbRow.cpu_clock
      });
    }
    return jsonArray;
  }

};

