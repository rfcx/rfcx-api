var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../misc/aws.js").aws();
var token = require("../../../misc/token.js").token;
function loadViews() { return require("../../../views/v1"); }

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

