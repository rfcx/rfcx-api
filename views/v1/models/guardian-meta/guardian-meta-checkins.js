var util = require("util");

exports.models = {

  guardianMetaCheckIns: function(req,res,dbCheckIns) {

    if (!util.isArray(dbCheckIns)) { dbCheckIns = [dbCheckIns]; }

    var jsonArray = [];

    for (i in dbCheckIns) {

      var dbRow = dbCheckIns[i];

      jsonArray.push({
        measured_at: dbRow.measured_at,
        queued_for: (dbRow.measured_at.valueOf()-dbRow.queued_at.valueOf()),
        latency: dbRow.request_latency_guardian,
        queued: dbRow.guardian_queued_checkins
        //,
        //skipped: dbRow.guardian_skipped_checkins,
      });
    }
    return jsonArray;
  
  }

};

