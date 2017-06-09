var util    = require("util"),
    Promise = require("bluebird"),
    moment  = require("moment");

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

    if (!dbRow.audio_guid || !dbRow.guardian_guid) {
      continue;
    }

    var dbGuardianGuid = dbRow.guardian_guid;

    if (!json.guardians[dbGuardianGuid]) {
      json.guardians[dbGuardianGuid] = {
        guid: dbGuardianGuid,
        shortname: dbRow.guardian_shortname,
        coords: {
          lat: dbRow.shadow_latitude,
          lon: dbRow.shadow_longitude
        },
        events: {}
      };
    }

    var guardian = json.guardians[dbGuardianGuid],
        value = dbRow.event_value;

    if (!guardian.events[value]) {
      guardian.events[value] = 0;
    }
    guardian.events[value]++;

  }

  return Object.keys(json.guardians).map(function(key) {
    return json.guardians[key];
  });
}

function countEventsByDates(dbAudioEvents) {
  var json = {
    dates: {}
  };

  dbAudioEvents = dbAudioEvents.sort(function(a,b) {
    return new Date(a.begins_at).getTime() > new Date(b.begins_at).getTime();
  });

  dbAudioEvents.forEach(function(event) {
    var dateStr = moment(event.begins_at).format('MM/DD/YYYY');

    if (!json.dates[dateStr]) {
      json.dates[dateStr] = {};
    }

    var value = event.event_value;
    var dateObj = json.dates[dateStr];

    if (!dateObj[value]) {
      dateObj[value] = 0;
    }

    dateObj[value]++;

  });

  return json.dates;
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
            audio_guid: dbRow.audio_guid,
            meta_url: process.env.ASSET_URLBASE + "/audio/" + dbRow.audio_guid + '.json',
            audio: {
              mp3: process.env.ASSET_URLBASE + "/audio/" + dbRow.audio_guid + '.mp3',
              png: process.env.ASSET_URLBASE + "/audio/" + dbRow.audio_guid + '.png',
              opus: process.env.ASSET_URLBASE + "/audio/" + dbRow.audio_guid + '.opus'
            },
            latitude: dbRow.shadow_latitude,
            longitude: dbRow.shadow_longitude,
            begins_at: dbRow.begins_at,
            ends_at: dbRow.ends_at,
            type: dbRow.event_type,
            value: dbRow.event_value,
            confidence: dbRow.confidence,
            guardian_guid: dbRow.guardian_guid,
            guardian_shortname: dbRow.guardian_shortname,
            site: dbRow.site_guid,
            reviewer_confirmed: dbRow.reviewer_confirmed,
            reviewer_guid: dbRow.user_guid,
            ai_guid: dbRow.model_guid,
            ai_min_conf: dbRow.model_minimal_detection_confidence,
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

  guardianAudioEventsByDatesJson: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        resolve(countEventsByDates(dbAudioEvents));

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

        var csv = 'event_guid,audio_guid,meta_url,latitude,longitude,begins_at,ends_at,type,value,confidence,guardian_guid,guardian_shortname,' +
                   'site,reviewer_confirmed,reviewer_guid\r\n';

        for (var i = 0; i < dbAudioEvents.length; i++) {

          var dbRow = dbAudioEvents[i];

          csv += dbRow.guid + ',';
          csv += dbRow.audio_guid + ',';
          csv += process.env.ASSET_URLBASE + "/audio/" + dbRow.audio_guid + '.json,';
          csv += dbRow.shadow_latitude + ',';
          csv += dbRow.shadow_longitude + ',';
          csv += dbRow.begins_at.toISOString() + ',';
          csv += dbRow.ends_at.toISOString() + ',';
          csv += dbRow.event_type + ',';
          csv += dbRow.event_value + ',';
          csv += dbRow.confidence + ',';
          csv += dbRow.guardian_guid + ',';
          csv += dbRow.guardian_shortname + ',';
          csv += dbRow.site_guid + ',';
          csv += dbRow.reviewer_confirmed + ',';
          csv += dbRow.user_guid + '\r\n';
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

  },

  guardianAudioEventsByDatesCSV: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var csv = 'date,';

        var labelValues = extractLabelValues(dbAudioEvents);

        labelValues.forEach(function(value) {
          csv += value + ',';
        });

        csv = csv.slice(0, -1);
        csv += '\r\n';

        var json = countEventsByDates(dbAudioEvents);

        for (var key in json) {
          if (json.hasOwnProperty(key)) {

            var item = json[key];

            csv += key + ',';

            labelValues.forEach(function(value) {
              csv += (item[value] !== undefined? item[value] : 0) + ',';
            });

            if (labelValues.length) {
              csv = csv.slice(0, -1);
            }
            csv += '\r\n';

          }
        }

        resolve(csv);

      }
      catch (err) {
        reject(err);
      }

    });

  }

};

