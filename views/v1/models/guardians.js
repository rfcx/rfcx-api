var util = require("util");

exports.models = {

  guardian: function(req,res,dbGuardian) {

    if (!util.isArray(dbGuardian)) { dbGuardian = [dbGuardian]; }
    
    var jsonArray = [];

    for (i in dbGuardian) {

      var dbRow = dbGuardian[i];

      var guardian = {
        guid: dbRow.guid,
        shortname: dbRow.shortname,
        is_certified: dbRow.is_certified,
        carrier: {
          name: dbRow.carrier_name,
          number: dbRow.phone_number
        },
        cartodb_coverage_id: dbRow.cartodb_coverage_id,
        location: {
          latitude: parseFloat(dbRow.latitude),
          longitude: parseFloat(dbRow.longitude)
        },
        software: [],
        checkins: {
          guardian: {
            count: dbRow.check_in_count,
            last_checkin_at: dbRow.last_check_in
          },
          updater: {
            count: dbRow.update_check_in_count,
            last_checkin_at: dbRow.last_update_check_in
          }
        }
      };

//      if (dbRow.Version != null) { guardian.software_version = dbRow.Version.number; }

      jsonArray.push(guardian);
    }
    return jsonArray;

  }


};

