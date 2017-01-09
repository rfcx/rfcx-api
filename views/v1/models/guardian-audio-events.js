var util    = require("util"),
    Promise = require("bluebird");

function extractLabelValues(dbAudioEvents) {

  var arr = [];

  dbAudioEvents.forEach(function(item) {
    var value = item.Value.value;
    if (arr.indexOf(value) === -1) {
      arr.push(value);
    }
  });

  return arr;

}

function countEventsByGuardians(dbAudioEvents) {

  var json = {
    guardians: {}
  };

  for (var i = 0; i < dbAudioEvents.length; i++) {

    var dbRow = dbAudioEvents[i];

    if (!dbRow.Audio || !dbRow.Guardian) {
      continue;
    }

    var dbGuardian = dbRow.Guardian,
      dbGuardianGuid = dbGuardian.guid;

    if (!json.guardians[dbGuardianGuid]) {
      json.guardians[dbGuardianGuid] = {
        guid: dbGuardianGuid,
        shortname: dbGuardian.shortname,
        coords: {
          lat: dbGuardian.latitude,
          lon: dbGuardian.longitude
        },
        events: {}
      };
    }

    var guardian = json.guardians[dbGuardianGuid],
      value = dbRow.Value.value;

    if (!guardian.events[value]) {
      guardian.events[value] = 0;
    }
    guardian.events[value]++;

  }

  return Object.keys(json.guardians).map(function(key) {
    return json.guardians[key];
  });
}

exports.models = {

  guardianAudioEventsJson: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var json = {
          events: []
        };

        for (var i = 0; i < dbAudioEvents.length; i++) {

          var dbRow = dbAudioEvents[i];

          json.events.push({
            event_guid: dbRow.guid,
            audio_guid: dbRow.Audio.guid,
            meta_url: process.env.ASSET_URLBASE + "/audio/" + dbRow.Audio.guid + '.json',
            latitude: dbRow.shadow_latitude,
            longitude: dbRow.shadow_longitude,
            begins_at: dbRow.begins_at,
            ends_at: dbRow.ends_at,
            type: dbRow.Type.value,
            value: dbRow.Value.value,
            confidence: dbRow.confidence,
            guardian_guid: dbRow.Audio && dbRow.Audio.Guardian? dbRow.Audio.Guardian.guid : null,
            guardian_shortname: dbRow.Audio && dbRow.Audio.Guardian? dbRow.Audio.Guardian.shortname : null
          });

        }

        resolve(json);

      }
      catch (err) {
        reject(err);
      }

    })

  },

  guardianAudioEventsByGuardianJson: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        resolve(countEventsByGuardians(dbAudioEvents));

      }
      catch (err) {
        reject(err);
      }

    })

  },

  guardianAudioEventsCSV: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var csv = 'event_guid,audio_guid,meta_url,latitude,longitude,begins_at,ends_at,type,value,confidence,guardian_guid,guardian_shortname\r\n';

        for (var i = 0; i < dbAudioEvents.length; i++) {

          var dbRow = dbAudioEvents[i];

          csv += dbRow.guid + ',';
          csv += dbRow.Audio.guid + ',';
          csv += process.env.ASSET_URLBASE + "/audio/" + dbRow.Audio.guid + '.json,';
          csv += dbRow.shadow_latitude + ',';
          csv += dbRow.shadow_longitude + ',';
          csv += dbRow.begins_at.toISOString() + ',';
          csv += dbRow.ends_at.toISOString() + ',';
          csv += dbRow.Type.value + ',';
          csv += dbRow.Value.value + ',';
          csv += dbRow.confidence + ',';
          csv += (dbRow.Audio && dbRow.Audio.Guardian? dbRow.Audio.Guardian.guid : 'null') + ',';
          csv += (dbRow.Audio && dbRow.Audio.Guardian? dbRow.Audio.Guardian.shortname : 'null') + '\r\n';

        }

        resolve(csv);

      }
      catch (err) {
        reject(err);
      }

    });

  },

  guardianAudioEventsByGuardianCSV: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var csv = 'guardian_guid,shortname,latitude,longitude,';

        var labelValues = extractLabelValues(dbAudioEvents);

        labelValues.forEach(function(value) {
          csv += value + ',';
        });

        csv = csv.slice(0, -1);
        csv += '\r\n';

        var arr = countEventsByGuardians(dbAudioEvents);

        arr.forEach(function(item) {
          csv += item.guid + ',';
          csv += item.shortname + ',';
          csv += item.coords.lat + ',';
          csv += item.coords.lon + ',';

          labelValues.forEach(function(value) {
            csv += (item.events[value] !== undefined? item.events[value] : 0) + ',';
          });

          if (labelValues.length) {
            csv = csv.slice(0, -1);
          }
          csv += '\r\n';
        });

        resolve(csv);

      }
      catch (err) {
        reject(err);
      }

    });

  }

};

