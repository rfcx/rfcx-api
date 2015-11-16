var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var token = require("../../../utils/auth-token.js").token;
function getAllViews() { return require("../../../views/v1"); }

exports.models = {

  guardianEvents: function(req,res,dbEvents) {

    var views = getAllViews();

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

      if (dbRow.harmonic_intervals != null) { guardianEvent.fingerprint = dbRow.harmonic_intervals; }

      jsonArray.push(guardianEvent);
    }
    return jsonArray;

  }


};

