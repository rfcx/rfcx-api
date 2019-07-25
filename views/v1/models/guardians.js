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
        is_visible: dbRow.is_visible,
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
        },
        last_sync: dbRow.last_sync? dbRow.last_sync : null,
        battery_percent: dbRow.battery_percent? dbRow.battery_percent : null,
        site: dbRow.Site? {
          guid: dbRow.Site.guid,
          name: dbRow.Site.name
        } : null,
        last_audio: dbRow.last_audio? dbRow.last_audio : null,
        notes: dbRow.notes || null,
      };

      jsonArray.push(guardian);
    }
    return jsonArray;

  },

  guardianPublicInfo: function(dbGuardian) {

    if (!util.isArray(dbGuardian)) { dbGuardian = [dbGuardian]; }

    var jsonArray = [];

    for (i in dbGuardian) {

      var dbRow = dbGuardian[i];

      var guardian = {
        guid: dbRow.guid,
        shortname: dbRow.shortname,
        site_name: dbRow.Site.name,
        site_description: dbRow.Site.description,
        timezone: dbRow.Site.timezone,
      };

      jsonArray.push(guardian);
    }
    return jsonArray;

  }


};

