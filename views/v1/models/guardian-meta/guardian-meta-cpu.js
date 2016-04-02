var util = require("util");

exports.models = {

  guardianMetaCPU: function(req, res, dbMeta, modelInfo) {

    if (!util.isArray(dbMeta)) { dbMeta = [dbMeta]; }

    var jsonArray = [];

    for (i in dbMeta) {

      var dbRow = dbMeta[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        percent_usage: dbRow.cpu_percent,
        clock_speed: dbRow.cpu_clock
      });
    }
    return jsonArray;



  }

};

