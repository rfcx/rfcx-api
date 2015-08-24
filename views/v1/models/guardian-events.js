var util = require("util");

exports.models = {

  guardianEvents: function(req,res,dbEvents) {

    if (!util.isArray(dbEvents)) { dbEvents = [dbEvents]; }
    
    var jsonArray = [];

    for (i in dbEvents) {

      var dbRow = dbEvents[i];

      var guardianEvent = {
        guid: dbRow.guid,
        classification: dbRow.classification,
        measured_at: dbRow.measured_at,
        duration: dbRow.duration,
        location: {
          latitude: parseFloat(dbRow.latitude),
          longitude: parseFloat(dbRow.longitude)
        }
      };

//      if (dbRow.Version != null) { guardian.software_version = dbRow.Version.number; }

      jsonArray.push(guardianEvent);
    }
    return jsonArray;

  }


};

